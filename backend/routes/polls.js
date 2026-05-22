const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const QRCode = require('qrcode');
const { nanoid } = require('nanoid');
const Poll = require('../models/Poll');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middleware/auth');
const { voteLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// ─── Multer Config (image upload for poll options) ────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${nanoid(10)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  }
});

// ─── Helper: build voter fingerprint ─────────────────────────────────────────
const getVoterFingerprint = (req) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return ip;
};

// ─── Helper: broadcast poll update via Socket.IO ─────────────────────────────
const broadcastUpdate = (req, pollId, poll) => {
  const io = req.app.locals.io;
  if (io) io.to(pollId).emit('poll-update', poll);
};

// ─── POST /api/polls/create ───────────────────────────────────────────────────
// Works for both guests and authenticated users
router.post('/create', optionalAuth, upload.array('images', 10), async (req, res) => {
  try {
    const { title, description, type, options, settings } = req.body;

    // Validate required fields
    if (!title || !options) {
      return res.status(400).json({ success: false, error: 'Title and options are required' });
    }

    // Parse options (sent as JSON string from FormData)
    let parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
    let parsedSettings = typeof settings === 'string' ? JSON.parse(settings) : (settings || {});

    if (!Array.isArray(parsedOptions) || parsedOptions.length < 2) {
      return res.status(400).json({ success: false, error: 'At least 2 options are required' });
    }

    // Attach uploaded images to corresponding options
    const files = req.files || [];
    parsedOptions = parsedOptions.map((opt, idx) => ({
      ...opt,
      image: files[idx]
        ? `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/${files[idx].filename}`
        : opt.image || null
    }));

    // Generate a guest creator token if user is not logged in
    const creatorToken = req.user ? null : nanoid(32);

    const poll = await Poll.create({
      title: title.trim(),
      description: description?.trim(),
      type: type || 'single',
      options: parsedOptions,
      settings: {
        anonymous: parsedSettings.anonymous !== undefined ? parsedSettings.anonymous : true,
        requireName: parsedSettings.requireName || false,
        showResults: parsedSettings.showResults || 'always',
        password: parsedSettings.password || null,
        deadline: parsedSettings.deadline ? new Date(parsedSettings.deadline) : null,
        allowChangeVote: parsedSettings.allowChangeVote || false
      },
      creator: req.user?._id || null,
      creatorToken
    });

    // Link poll to user's profile
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { $push: { polls: poll._id } });
    }

    // Generate QR code for the poll URL
    const pollUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/poll/${poll._id}`;
    const qrCode = await QRCode.toDataURL(pollUrl);

    res.status(201).json({
      success: true,
      poll,
      pollUrl,
      qrCode,
      // Return creatorToken to guest so they can manage the poll
      ...(creatorToken && { creatorToken })
    });
  } catch (error) {
    console.error('Create poll error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ─── GET /api/polls/creator/mine ─────────────────────────────────────────────
// Get all polls for the authenticated user
router.get('/creator/mine', protect, async (req, res) => {
  try {
    const polls = await Poll.find({ creator: req.user._id })
      .sort({ createdAt: -1 })
      .select('-options.voters -comments'); // exclude heavy fields from list view

    res.json({ success: true, polls });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/polls/:id ───────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id).populate('creator', 'name email');
    if (!poll) return res.status(404).json({ success: false, error: 'Poll not found' });

    // Auto-close if past deadline
    if (poll.settings.deadline && new Date() > poll.settings.deadline && !poll.isClosed) {
      poll.isClosed = true;
      poll.closedAt = new Date();
      await poll.save();
    }

    // Handle result visibility
    const isCreator =
      (req.user && String(req.user._id) === String(poll.creator?._id)) ||
      req.headers['x-creator-token'] === poll.creatorToken;

    if (poll.settings.showResults === 'creator-only' && !isCreator) {
      // Strip vote counts for non-creators
      const sanitized = poll.toObject();
      sanitized.options = sanitized.options.map((o) => ({
        _id: o._id,
        text: o.text,
        image: o.image,
        votes: 0,
        voters: []
      }));
      sanitized.totalVotes = 0;
      return res.json({ success: true, poll: sanitized, hasVoted: false });
    }

    // For "after-vote" visibility, check cookie
    const votedCookie = req.cookies?.voted ? req.cookies.voted.split(',') : [];
    const hasVoted = votedCookie.includes(req.params.id);

    if (poll.settings.showResults === 'after-vote' && !hasVoted && !isCreator) {
      const sanitized = poll.toObject();
      sanitized.options = sanitized.options.map((o) => ({
        _id: o._id,
        text: o.text,
        image: o.image,
        votes: 0,
        voters: []
      }));
      sanitized.totalVotes = 0;
      return res.json({ success: true, poll: sanitized, hasVoted: false });
    }

    // Strip voter fingerprints from response (privacy)
    const pollObj = poll.toObject();
    pollObj.options = pollObj.options.map((o) => ({ ...o, voters: undefined }));

    res.json({ success: true, poll: pollObj, hasVoted, isCreator });
  } catch (error) {
    res.status(404).json({ success: false, error: 'Poll not found' });
  }
});

// ─── POST /api/polls/:id/vote ─────────────────────────────────────────────────
router.post('/:id/vote', voteLimiter, async (req, res) => {
  try {
    const { optionIndex, optionIndices, name, password } = req.body;
    const poll = await Poll.findById(req.params.id);

    if (!poll) return res.status(404).json({ success: false, error: 'Poll not found' });
    if (poll.isClosed) return res.status(400).json({ success: false, error: 'This poll is closed' });

    // Check deadline
    if (poll.settings.deadline && new Date() > poll.settings.deadline) {
      poll.isClosed = true;
      poll.closedAt = new Date();
      await poll.save();
      return res.status(400).json({ success: false, error: 'This poll has expired' });
    }

    // Password check
    if (poll.settings.password && poll.settings.password !== password) {
      return res.status(403).json({ success: false, error: 'Incorrect poll password' });
    }

    // Name requirement check
    if (poll.settings.requireName && !name) {
      return res.status(400).json({ success: false, error: 'Your name is required to vote' });
    }

    // Duplicate vote check via voter fingerprint (IP-based)
    const fingerprint = getVoterFingerprint(req);
    const allVoters = poll.options.flatMap((o) => o.voters);
    if (allVoters.includes(fingerprint)) {
      return res.status(400).json({ success: false, error: 'You have already voted on this poll' });
    }

    // Determine which options to vote for
    let indicesToVote = [];
    if (poll.type === 'multiple' && Array.isArray(optionIndices)) {
      indicesToVote = optionIndices;
    } else if (optionIndex !== undefined) {
      indicesToVote = [optionIndex];
    } else {
      return res.status(400).json({ success: false, error: 'No option selected' });
    }

    // Validate indices
    for (const idx of indicesToVote) {
      if (idx < 0 || idx >= poll.options.length) {
        return res.status(400).json({ success: false, error: `Invalid option index: ${idx}` });
      }
    }

    // Apply votes
    for (const idx of indicesToVote) {
      poll.options[idx].votes += 1;
      poll.options[idx].voters.push(fingerprint);
    }
    poll.totalVotes += 1;

    // Add vote comment if name provided and not anonymous
    if (!poll.settings.anonymous && name) {
      const votedOptions = indicesToVote.map((i) => poll.options[i].text).join(', ');
      poll.comments.push({ name, text: `Voted for: "${votedOptions}"` });
    }

    await poll.save();

    // Broadcast real-time update
    const pollObj = poll.toObject();
    pollObj.options = pollObj.options.map((o) => ({ ...o, voters: undefined }));
    broadcastUpdate(req, req.params.id, pollObj);

    // Trigger webhook if configured
    if (poll.webhookUrl) {
      const totalVotes = poll.totalVotes;
      const summary = poll.options.map((o) => `${o.text}: ${o.votes}`).join(', ');
      fetch(poll.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `📊 *${poll.title}* — ${totalVotes} votes cast\n${summary}`
        })
      }).catch(console.error);
    }

    res.json({ success: true, poll: pollObj });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ─── POST /api/polls/:id/comment ─────────────────────────────────────────────
router.post('/:id/comment', async (req, res) => {
  try {
    const { name, text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Comment text is required' });
    }

    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ success: false, error: 'Poll not found' });

    const comment = { name: name?.trim() || 'Anonymous', text: text.trim() };
    poll.comments.push(comment);
    await poll.save();

    // Broadcast updated comments
    broadcastUpdate(req, req.params.id, poll.toObject());

    res.json({ success: true, comment: poll.comments[poll.comments.length - 1] });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ─── POST /api/polls/:id/close ────────────────────────────────────────────────
router.post('/:id/close', optionalAuth, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ success: false, error: 'Poll not found' });

    // Verify requester is the creator
    const isCreator =
      (req.user && String(req.user._id) === String(poll.creator?._id)) ||
      req.headers['x-creator-token'] === poll.creatorToken;

    if (!isCreator) {
      return res.status(403).json({ success: false, error: 'Only the creator can close this poll' });
    }

    poll.isClosed = true;
    poll.closedAt = new Date();
    await poll.save();

    broadcastUpdate(req, req.params.id, poll.toObject());
    res.json({ success: true, poll });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ─── POST /api/polls/:id/duplicate ───────────────────────────────────────────
router.post('/:id/duplicate', protect, async (req, res) => {
  try {
    const original = await Poll.findById(req.params.id);
    if (!original) return res.status(404).json({ success: false, error: 'Poll not found' });

    const cloneData = original.toObject();
    delete cloneData._id;
    delete cloneData.shortCode;
    delete cloneData.createdAt;
    delete cloneData.updatedAt;
    delete cloneData.__v;

    // Reset votes on cloned options
    cloneData.options = cloneData.options.map((o) => ({
      ...o,
      votes: 0,
      voters: [],
      _id: undefined
    }));

    const clone = await Poll.create({
      ...cloneData,
      title: `${original.title} (Copy)`,
      creator: req.user._id,
      creatorToken: null,
      totalVotes: 0,
      isClosed: false,
      closedAt: null,
      comments: [],
      duplicatedFrom: original._id
    });

    await User.findByIdAndUpdate(req.user._id, { $push: { polls: clone._id } });

    res.status(201).json({ success: true, poll: clone });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ─── DELETE /api/polls/:id ────────────────────────────────────────────────────
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ success: false, error: 'Poll not found' });

    const isCreator =
      (req.user && String(req.user._id) === String(poll.creator?._id)) ||
      req.headers['x-creator-token'] === poll.creatorToken;
    const isAdmin = req.user?.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this poll' });
    }

    await Poll.findByIdAndDelete(req.params.id);
    if (poll.creator) {
      await User.findByIdAndUpdate(poll.creator, { $pull: { polls: poll._id } });
    }

    res.json({ success: true, message: 'Poll deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ─── GET /api/polls/:id/export ────────────────────────────────────────────────
router.get('/:id/export', optionalAuth, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ success: false, error: 'Poll not found' });

    const isCreator =
      (req.user && String(req.user._id) === String(poll.creator?._id)) ||
      req.headers['x-creator-token'] === poll.creatorToken;
    const isAdmin = req.user?.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Only the creator can export poll data' });
    }

    const exportPath = path.join(__dirname, '..', 'uploads', `export-${poll._id}.csv`);
    const csvWriter = createObjectCsvWriter({
      path: exportPath,
      header: [
        { id: 'option', title: 'Option' },
        { id: 'votes', title: 'Votes' },
        { id: 'percentage', title: 'Percentage (%)' }
      ]
    });

    const records = poll.options.map((o) => ({
      option: o.text,
      votes: o.votes,
      percentage: poll.totalVotes > 0 ? ((o.votes / poll.totalVotes) * 100).toFixed(1) : '0.0'
    }));

    await csvWriter.writeRecords(records);
    res.download(exportPath, `${poll.title.replace(/[^a-z0-9]/gi, '_')}_results.csv`, () => {
      fs.unlink(exportPath, () => {}); // cleanup temp file after download
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
