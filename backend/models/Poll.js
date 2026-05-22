const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

/**
 * Poll Schema
 * Supports: single choice, multiple choice, and ranking polls.
 * Includes settings for anonymity, deadline, password, result visibility.
 * Has built-in duplicate voting prevention via IP tracking.
 */
const pollSchema = new mongoose.Schema(
  {
    // Short, URL-friendly ID (e.g. "abc123") instead of long ObjectId
    shortCode: {
      type: String,
      default: () => nanoid(8),
      unique: true,
      index: true
    },

    // Reference to registered creator (null for guest-created polls)
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // Token given to guest creators to manage their poll (stored in localStorage)
    creatorToken: {
      type: String,
      default: null
    },

    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, trim: true, maxlength: 1000 },

    // Poll question type
    type: {
      type: String,
      enum: ['single', 'multiple', 'ranking'],
      default: 'single'
    },

    // Poll answer options
    options: [
      {
        text: { type: String, required: true, trim: true },
        image: { type: String, default: null }, // URL to uploaded image
        votes: { type: Number, default: 0 },
        // Store voter fingerprints (IP + optional name hash) to prevent duplicates
        voters: [{ type: String }]
      }
    ],

    // Settings block
    settings: {
      anonymous: { type: Boolean, default: true },      // hide voter identities
      requireName: { type: Boolean, default: false },   // force voters to enter name
      showResults: {
        type: String,
        enum: ['always', 'after-vote', 'creator-only'],
        default: 'always'
      },
      password: { type: String, default: null },        // password-protect the poll
      deadline: { type: Date, default: null },           // auto-close date/time
      allowChangeVote: { type: Boolean, default: false } // let voters change their choice
    },

    totalVotes: { type: Number, default: 0 },
    isClosed: { type: Boolean, default: false },

    // Comments / discussion thread
    comments: [
      {
        name: { type: String, default: 'Anonymous' },
        text: { type: String, required: true, maxlength: 500 },
        createdAt: { type: Date, default: Date.now }
      }
    ],

    // Webhook URL to post results to (Slack / Discord)
    webhookUrl: { type: String, default: null },

    // Reference if this poll was cloned from another
    duplicatedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poll',
      default: null
    },

    // TTL index: MongoDB will auto-delete anonymous polls 30 days after closing
    // (managed via the cleanup cron job in utils/cleanup.js)
    closedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// Index for fast creator lookup
pollSchema.index({ creator: 1, createdAt: -1 });

// TTL index: auto-delete documents where closedAt is set, after 30 days
// Only applies if the poll has no registered creator (anonymous/guest)
pollSchema.index(
  { closedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { creator: null } }
);

module.exports = mongoose.model('Poll', pollSchema);
