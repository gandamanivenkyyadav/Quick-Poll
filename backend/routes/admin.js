const express = require('express');
const mongoose = require('mongoose');
const Poll = require('../models/Poll');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(protect, adminOnly);

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [totalPolls, totalUsers, activePolls, closedPolls, totalVotesResult] = await Promise.all([
      Poll.countDocuments(),
      User.countDocuments(),
      Poll.countDocuments({ isClosed: false }),
      Poll.countDocuments({ isClosed: true }),
      Poll.aggregate([{ $group: { _id: null, total: { $sum: '$totalVotes' } } }])
    ]);

    const totalVotes = totalVotesResult[0]?.total || 0;
    const dbState = mongoose.connection.readyState;

    res.json({
      success: true,
      stats: {
        totalPolls,
        totalUsers,
        activePolls,
        closedPolls,
        totalVotes,
        dbState: dbState === 1 ? 'Connected' : 'Disconnected',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/admin/polls ─────────────────────────────────────────────────────
router.get('/polls', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = search
      ? { title: { $regex: search, $options: 'i' } }
      : {};

    const [polls, total] = await Promise.all([
      Poll.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('creator', 'name email')
        .select('-options.voters'),
      Poll.countDocuments(query)
    ]);

    res.json({
      success: true,
      polls,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-password');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── DELETE /api/admin/polls/:id ─────────────────────────────────────────────
router.delete('/polls/:id', async (req, res) => {
  try {
    const poll = await Poll.findByIdAndDelete(req.params.id);
    if (!poll) return res.status(404).json({ success: false, error: 'Poll not found' });

    if (poll.creator) {
      await User.findByIdAndUpdate(poll.creator, { $pull: { polls: poll._id } });
    }

    res.json({ success: true, message: 'Poll force-deleted by admin' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── PATCH /api/admin/users/:id/role ─────────────────────────────────────────
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
