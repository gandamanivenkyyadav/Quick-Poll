import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Settings, Image as ImageIcon, Lock, Eye, Calendar, User, CheckSquare, List, ArrowUpDown, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const POLL_TYPES = [
  { id: 'single', label: 'Single Choice', icon: List, desc: 'Pick one option' },
  { id: 'multiple', label: 'Multiple Choice', icon: CheckSquare, desc: 'Pick multiple' },
  { id: 'ranking', label: 'Ranking', icon: ArrowUpDown, desc: 'Order by preference' }
];

const VISIBILITY_OPTIONS = [
  { value: 'always', label: 'Always visible' },
  { value: 'after-vote', label: 'After voting only' },
  { value: 'creator-only', label: 'Creator only' }
];

const CreatePoll = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [createdPoll, setCreatedPoll] = useState(null); // holds created poll data
  const [poll, setPoll] = useState({
    title: '',
    description: '',
    type: 'single',
    options: [{ text: '', image: null }, { text: '', image: null }],
    settings: {
      anonymous: true,
      requireName: false,
      showResults: 'always',
      deadline: '',
      password: '',
      allowChangeVote: false
    },
    webhookUrl: ''
  });

  // ─── Options Management ────────────────────────────────────────────────────
  const addOption = () => {
    if (poll.options.length >= 10) {
      toast.error('Maximum 10 options allowed');
      return;
    }
    setPoll((p) => ({ ...p, options: [...p.options, { text: '', image: null }] }));
  };

  const removeOption = (idx) => {
    if (poll.options.length <= 2) {
      toast.error('Minimum 2 options required');
      return;
    }
    setPoll((p) => ({ ...p, options: p.options.filter((_, i) => i !== idx) }));
  };

  const updateOption = (idx, field, value) => {
    const newOptions = [...poll.options];
    newOptions[idx] = { ...newOptions[idx], [field]: value };
    setPoll((p) => ({ ...p, options: newOptions }));
  };

  // ─── Drag & Drop for Ranking ───────────────────────────────────────────────
  const [dragIdx, setDragIdx] = useState(null);

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newOptions = [...poll.options];
    const [dragged] = newOptions.splice(dragIdx, 1);
    newOptions.splice(idx, 0, dragged);
    setPoll((p) => ({ ...p, options: newOptions }));
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  // ─── Image Upload Handler ──────────────────────────────────────────────────
  const handleImageChange = (idx, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => updateOption(idx, 'imagePreview', e.target.result);
    reader.readAsDataURL(file);
    updateOption(idx, 'image', file);
  };

  // ─── Form Validation ───────────────────────────────────────────────────────
  const validate = useCallback(() => {
    if (!poll.title.trim()) { toast.error('Poll title is required'); return false; }
    if (poll.title.length > 300) { toast.error('Title too long (max 300 chars)'); return false; }
    const filledOptions = poll.options.filter((o) => o.text.trim());
    if (filledOptions.length < 2) { toast.error('At least 2 options with text are required'); return false; }
    return true;
  }, [poll]);

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', poll.title.trim());
      formData.append('description', poll.description.trim());
      formData.append('type', poll.type);

      // Attach images (one per option)
      const optionsForApi = poll.options
        .filter((o) => o.text.trim())
        .map((o, idx) => {
          if (o.image) formData.append('images', o.image);
          return { text: o.text.trim() };
        });

      formData.append('options', JSON.stringify(optionsForApi));
      formData.append('settings', JSON.stringify({
        ...poll.settings,
        deadline: poll.settings.deadline || null,
        password: poll.settings.password || null
      }));
      if (poll.webhookUrl) formData.append('webhookUrl', poll.webhookUrl);

      const res = await api.post('/polls/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Save guest creator token if returned
      if (res.data.creatorToken) {
        localStorage.setItem('qp_creator_token', res.data.creatorToken);
      }

      setCreatedPoll(res.data);
      toast.success('🎉 Poll created successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  // ─── Success Screen ────────────────────────────────────────────────────────
  if (createdPoll) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full glass p-8 text-center animate-slide-up">
          <div className="w-20 h-20 rounded-full bg-accent-500/20 border border-accent-500/30 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Poll is live!</h2>
          <p className="text-white/60 mb-8">Share the link below to start collecting votes.</p>

          {/* Share URL */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3 mb-4">
            <input
              readOnly
              value={createdPoll.pollUrl}
              className="flex-1 bg-transparent text-sm text-primary-400 min-w-0 outline-none"
              id="poll-url-input"
            />
            <button
              onClick={() => { navigator.clipboard.writeText(createdPoll.pollUrl); toast.success('Link copied!'); }}
              className="shrink-0 btn-primary text-xs px-3 py-2"
              id="copy-link-btn"
            >
              Copy
            </button>
          </div>

          {/* QR Code */}
          {createdPoll.qrCode && (
            <div className="mb-6">
              <img src={createdPoll.qrCode} alt="QR Code" className="mx-auto w-36 h-36 rounded-xl border border-white/10" />
              <p className="text-xs text-white/30 mt-2">Scan to vote</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate(`/poll/${createdPoll.poll._id}`)}
              className="btn-primary flex-1"
              id="view-poll-btn"
            >
              View Poll <ArrowRight size={16} />
            </button>
            <button
              onClick={() => { setCreatedPoll(null); setPoll({ title: '', description: '', type: 'single', options: [{ text: '' }, { text: '' }], settings: { anonymous: true, requireName: false, showResults: 'always', deadline: '', password: '', allowChangeVote: false }, webhookUrl: '' }); }}
              className="btn-ghost flex-1"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Create Form ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Page Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black text-white mb-3">Create a Poll</h1>
        <p className="text-white/50">Build your poll, configure settings, and share it in minutes.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" id="create-poll-form">

        {/* ── Basic Info ── */}
        <div className="glass p-6 space-y-4">
          <h2 className="font-semibold text-white text-lg mb-2">📝 Poll Details</h2>
          <div>
            <label className="label">Question / Title *</label>
            <input
              type="text"
              placeholder="e.g., What should we order for lunch?"
              value={poll.title}
              onChange={(e) => setPoll((p) => ({ ...p, title: e.target.value }))}
              className="input"
              maxLength={300}
              required
              id="poll-title"
            />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea
              placeholder="Add extra context for voters..."
              value={poll.description}
              onChange={(e) => setPoll((p) => ({ ...p, description: e.target.value }))}
              className="input resize-none"
              rows={3}
              maxLength={1000}
              id="poll-description"
            />
          </div>

          {/* Poll Type */}
          <div>
            <label className="label">Poll Type</label>
            <div className="grid grid-cols-3 gap-3">
              {POLL_TYPES.map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPoll((p) => ({ ...p, type: id }))}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    poll.type === id
                      ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                  }`}
                  id={`type-${id}`}
                >
                  <Icon size={20} className="mb-2" />
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs opacity-60 mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Options ── */}
        <div className="glass p-6 space-y-3">
          <h2 className="font-semibold text-white text-lg mb-2">
            🎯 Answer Options
            {poll.type === 'ranking' && (
              <span className="text-xs text-white/40 font-normal ml-2">(drag to reorder)</span>
            )}
          </h2>

          {poll.options.map((option, idx) => (
            <div
              key={idx}
              draggable={poll.type === 'ranking'}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                dragIdx === idx
                  ? 'border-primary-500/50 bg-primary-500/10'
                  : 'border-white/10 bg-white/5'
              } ${poll.type === 'ranking' ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              {/* Rank number */}
              <div className="w-7 h-7 shrink-0 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white/50">
                {idx + 1}
              </div>

              <input
                type="text"
                placeholder={`Option ${idx + 1}`}
                value={option.text}
                onChange={(e) => updateOption(idx, 'text', e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-white/30 outline-none text-sm"
                id={`option-${idx}`}
              />

              {/* Image preview + upload */}
              <label className="shrink-0 cursor-pointer group" title="Attach image">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageChange(idx, e.target.files[0])}
                />
                {option.imagePreview ? (
                  <img src={option.imagePreview} alt="" className="w-9 h-9 rounded-lg object-cover border border-white/20" />
                ) : (
                  <div className="w-9 h-9 rounded-lg border border-dashed border-white/20 group-hover:border-primary-500/50 flex items-center justify-center transition-colors">
                    <ImageIcon size={15} className="text-white/30 group-hover:text-primary-400" />
                  </div>
                )}
              </label>

              <button
                type="button"
                onClick={() => removeOption(idx)}
                disabled={poll.options.length <= 2}
                className="shrink-0 text-white/30 hover:text-red-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addOption}
            className="w-full py-3 rounded-xl border border-dashed border-white/20 hover:border-primary-500/40 text-white/40 hover:text-primary-400 text-sm font-medium transition-all flex items-center justify-center gap-2"
            id="add-option-btn"
          >
            <Plus size={16} />
            Add Option
          </button>
        </div>

        {/* ── Settings ── */}
        <div className="glass p-6 space-y-5">
          <h2 className="font-semibold text-white text-lg mb-2 flex items-center gap-2">
            <Settings size={18} className="text-primary-400" />
            Poll Settings
          </h2>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Deadline */}
            <div>
              <label className="label flex items-center gap-1.5">
                <Calendar size={13} /> Deadline
              </label>
              <input
                type="datetime-local"
                value={poll.settings.deadline}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setPoll((p) => ({ ...p, settings: { ...p.settings, deadline: e.target.value } }))}
                className="input text-sm [color-scheme:dark]"
                id="poll-deadline"
              />
            </div>

            {/* Password */}
            <div>
              <label className="label flex items-center gap-1.5">
                <Lock size={13} /> Password (optional)
              </label>
              <input
                type="password"
                placeholder="Leave blank for no password"
                value={poll.settings.password}
                onChange={(e) => setPoll((p) => ({ ...p, settings: { ...p.settings, password: e.target.value } }))}
                className="input text-sm"
                id="poll-password"
              />
            </div>

            {/* Result Visibility */}
            <div>
              <label className="label flex items-center gap-1.5">
                <Eye size={13} /> Show Results
              </label>
              <select
                value={poll.settings.showResults}
                onChange={(e) => setPoll((p) => ({ ...p, settings: { ...p.settings, showResults: e.target.value } }))}
                className="input text-sm bg-surface-900"
                id="poll-visibility"
              >
                {VISIBILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Webhook */}
            <div>
              <label className="label">Webhook URL (Slack/Discord)</label>
              <input
                type="url"
                placeholder="https://hooks.slack.com/..."
                value={poll.webhookUrl}
                onChange={(e) => setPoll((p) => ({ ...p, webhookUrl: e.target.value }))}
                className="input text-sm"
                id="poll-webhook"
              />
            </div>
          </div>

          {/* Toggle switches */}
          <div className="flex flex-wrap gap-4 pt-2">
            {[
              { key: 'anonymous', label: 'Anonymous Voting', icon: User },
              { key: 'requireName', label: 'Require Name', icon: User },
              { key: 'allowChangeVote', label: 'Allow Vote Change', icon: ArrowUpDown }
            ].map(({ key, label, icon: Icon }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    poll.settings[key] ? 'bg-primary-500' : 'bg-white/10'
                  }`}
                  onClick={() => setPoll((p) => ({ ...p, settings: { ...p.settings, [key]: !p.settings[key] } }))}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${poll.settings[key] ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm text-white/70 group-hover:text-white transition-colors flex items-center gap-1.5">
                  <Icon size={13} />
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-4 text-base shadow-2xl shadow-primary-900/50"
          id="create-poll-submit"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating Poll...
            </>
          ) : (
            <>
              🚀 Create & Share Poll
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default CreatePoll;
