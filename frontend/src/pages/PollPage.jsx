import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, Download, Lock, Share2, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../utils/api';
import useSocket from '../hooks/useSocket';
import ChartSection from '../components/ChartSection';
import CommentSection from '../components/CommentSection';
import toast from 'react-hot-toast';

const PollPage = () => {
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voted, setVoted] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [rankingOrder, setRankingOrder] = useState([]);
  const [voterName, setVoterName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // ─── Fetch Poll ───────────────────────────────────────────────────────────
  const fetchPoll = useCallback(async () => {
    try {
      const res = await api.get(`/polls/${id}`);
      setPoll(res.data.poll);
      setVoted(res.data.hasVoted || false);
      // Initialize ranking order
      if (res.data.poll.type === 'ranking') {
        setRankingOrder(res.data.poll.options.map((_, i) => i));
      }
    } catch {
      setError('Poll not found or has been deleted.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchPoll(); }, [fetchPoll]);

  // ─── Real-Time Updates via Socket.IO ─────────────────────────────────────
  const handleSocketUpdate = useCallback((updatedPoll) => {
    setPoll((prev) => prev ? { ...updatedPoll, comments: updatedPoll.comments || prev.comments } : updatedPoll);
  }, []);

  useSocket(id, handleSocketUpdate);

  // ─── Vote Handlers ────────────────────────────────────────────────────────
  const toggleOption = (idx) => {
    if (poll.type === 'single') {
      setSelectedIndices([idx]);
    } else if (poll.type === 'multiple') {
      setSelectedIndices((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
      );
    }
  };

  // Ranking drag/drop
  const [dragRank, setDragRank] = useState(null);
  const handleRankDragStart = (idx) => setDragRank(idx);
  const handleRankDragOver = (e, idx) => {
    e.preventDefault();
    if (dragRank === null || dragRank === idx) return;
    const newOrder = [...rankingOrder];
    const [moved] = newOrder.splice(dragRank, 1);
    newOrder.splice(idx, 0, moved);
    setRankingOrder(newOrder);
    setDragRank(idx);
  };

  const handleVote = async () => {
    if (submitting) return;

    // Check password if required
    if (poll.settings.password && !password) {
      setPasswordRequired(true);
      return;
    }

    if (poll.type === 'single' && selectedIndices.length === 0) {
      toast.error('Please select an option');
      return;
    }
    if (poll.type === 'multiple' && selectedIndices.length === 0) {
      toast.error('Please select at least one option');
      return;
    }
    if (poll.settings.requireName && !voterName.trim()) {
      toast.error('Your name is required to vote');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: voterName || undefined,
        password: password || undefined
      };

      if (poll.type === 'single') payload.optionIndex = selectedIndices[0];
      else if (poll.type === 'multiple') payload.optionIndices = selectedIndices;
      else if (poll.type === 'ranking') payload.optionIndices = rankingOrder;

      const res = await api.post(`/polls/${id}/vote`, payload);
      setPoll(res.data.poll);
      setVoted(true);
      setPasswordRequired(false);
      toast.success('✅ Vote submitted!');

      // Set cookie to remember vote
      document.cookie = `voted_${id}=1; max-age=${7 * 24 * 60 * 60}; path=/`;
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit vote';
      if (msg.includes('password')) setPasswordRequired(true);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  // ─── Loading / Error States ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/40">Loading poll...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <XCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Poll Not Found</h2>
        <p className="text-white/50">{error}</p>
        <a href="/" className="btn-primary mt-6">Go Home</a>
      </div>
    );
  }

  const isExpired = poll.settings?.deadline && new Date() > new Date(poll.settings.deadline);
  const isClosed = poll.isClosed || isExpired;
  const showResults = poll.settings.showResults === 'always' || voted || isClosed;
  const totalVotes = poll.totalVotes || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* ── Poll Header ── */}
      <div className="glass p-8 mb-6 animate-slide-up">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-white mb-2 leading-tight">{poll.title}</h1>
            {poll.description && (
              <p className="text-white/60 text-sm leading-relaxed">{poll.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isClosed ? (
              <span className="badge-red flex items-center gap-1"><XCircle size={12} />Closed</span>
            ) : (
              <span className="badge-green flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>

        {/* Meta stats */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
          <span className="flex items-center gap-1.5">
            👥 {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          </span>
          {poll.settings.deadline && (
            <span className={`flex items-center gap-1.5 ${isExpired ? 'text-red-400' : ''}`}>
              <Clock size={13} />
              {isExpired ? 'Expired' : `Closes ${new Date(poll.settings.deadline).toLocaleString()}`}
            </span>
          )}
          <span className="capitalize badge-blue">{poll.type}</span>
        </div>

        {/* Share bar */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/5">
          <button onClick={copyLink} className="btn-ghost text-xs py-2 px-3" id="copy-link-btn">
            <Copy size={13} /> Copy Link
          </button>
          <button onClick={() => setShowQR(!showQR)} className="btn-ghost text-xs py-2 px-3" id="qr-toggle-btn">
            <Share2 size={13} /> {showQR ? 'Hide' : 'Show'} QR
          </button>
          {showQR && (
            <div className="flex items-center gap-3 mt-3 w-full">
              <QRCodeCanvas
                value={window.location.href}
                size={100}
                bgColor="transparent"
                fgColor="#a5b4fc"
                level="M"
                id="qr-canvas"
              />
              <div className="text-xs text-white/40">
                Scan this code with your phone to open the poll
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Password Gate ── */}
      {passwordRequired && (
        <div className="glass p-6 mb-6 border border-amber-500/20 animate-fade-in">
          <h3 className="font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Lock size={16} /> Password Required
          </h3>
          <div className="flex gap-3">
            <input
              type="password"
              placeholder="Enter poll password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVote()}
              className="input flex-1"
              id="vote-password"
            />
            <button onClick={handleVote} className="btn-primary shrink-0">Unlock</button>
          </div>
        </div>
      )}

      {/* ── Voting Section ── */}
      {!voted && !isClosed && (
        <div className="glass p-6 mb-6 animate-slide-up">
          <h2 className="section-title">
            {poll.type === 'single' && '🎯 Choose one option'}
            {poll.type === 'multiple' && '✅ Select all that apply'}
            {poll.type === 'ranking' && '↕️ Drag to rank options'}
          </h2>

          {/* Name field */}
          {poll.settings.requireName && (
            <div className="mb-4">
              <label className="label">Your Name *</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
                className="input"
                id="voter-name"
              />
            </div>
          )}

          {/* Options */}
          <div className="space-y-3 mb-6">
            {poll.type === 'ranking'
              ? rankingOrder.map((optIdx, rankPos) => {
                  const option = poll.options[optIdx];
                  return (
                    <div
                      key={optIdx}
                      draggable
                      onDragStart={() => handleRankDragStart(rankPos)}
                      onDragOver={(e) => handleRankDragOver(e, rankPos)}
                      onDragEnd={() => setDragRank(null)}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-grab active:cursor-grabbing transition-all ${
                        dragRank === rankPos
                          ? 'border-primary-500/50 bg-primary-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary-500/20 text-primary-400 font-bold text-sm flex items-center justify-center shrink-0">
                        {rankPos + 1}
                      </div>
                      {option.image && (
                        <img src={option.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      )}
                      <span className="flex-1 text-white font-medium">{option.text}</span>
                      <span className="text-white/30 text-xs">drag ↕</span>
                    </div>
                  );
                })
              : poll.options.map((option, idx) => {
                  const isSelected = selectedIndices.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleOption(idx)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
                        isSelected
                          ? 'border-primary-500/60 bg-primary-500/15 shadow-lg shadow-primary-900/20'
                          : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/8'
                      }`}
                      id={`vote-option-${idx}`}
                    >
                      {/* Selection indicator */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'border-primary-500 bg-primary-500' : 'border-white/30'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>

                      {option.image && (
                        <img src={option.image} alt={option.text} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                      )}
                      <span className={`flex-1 font-medium ${isSelected ? 'text-primary-300' : 'text-white/80'}`}>
                        {option.text}
                      </span>
                      {isSelected && <CheckCircle size={16} className="text-primary-400 shrink-0" />}
                    </button>
                  );
                })}
          </div>

          <button
            onClick={handleVote}
            disabled={submitting || (poll.type !== 'ranking' && selectedIndices.length === 0)}
            className="btn-primary w-full py-4 text-base"
            id="submit-vote-btn"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              '🗳️ Submit Vote'
            )}
          </button>
        </div>
      )}

      {/* Voted / Closed banner */}
      {(voted || isClosed) && (
        <div className={`glass p-4 mb-6 flex items-center gap-3 ${
          isClosed ? 'border-red-500/20' : 'border-accent-500/20'
        }`}>
          {isClosed ? (
            <XCircle size={20} className="text-red-400 shrink-0" />
          ) : (
            <CheckCircle size={20} className="text-accent-400 shrink-0" />
          )}
          <p className="text-white/70 text-sm">
            {isClosed
              ? 'This poll is closed. Final results are shown below.'
              : 'Your vote was recorded! Results update in real-time.'}
          </p>
        </div>
      )}

      {/* ── Results Charts ── */}
      {showResults && <ChartSection poll={poll} />}

      {/* ── Export CSV ── */}
      {isClosed && (
        <div className="mt-4 flex justify-end">
          <a
            href={`/api/polls/${id}/export`}
            download
            className="btn-ghost text-sm"
            id="export-csv-btn"
          >
            <Download size={15} />
            Export CSV
          </a>
        </div>
      )}

      {/* ── Comments ── */}
      <CommentSection poll={poll} setPoll={setPoll} />
    </div>
  );
};

export default PollPage;
