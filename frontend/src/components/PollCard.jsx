import { Link } from 'react-router-dom';
import { Clock, Users, BarChart2, Copy, Trash2, Lock } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const PollCard = ({ poll, onDelete, onDuplicate }) => {
  const isExpired = poll.settings?.deadline && new Date() > new Date(poll.settings.deadline);
  const isClosed = poll.isClosed || isExpired;

  const handleDuplicate = async () => {
    try {
      const res = await api.post(`/polls/${poll._id}/duplicate`);
      toast.success('Poll duplicated successfully!');
      if (onDuplicate) onDuplicate(res.data.poll);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to duplicate poll');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this poll permanently?')) return;
    try {
      await api.delete(`/polls/${poll._id}`);
      toast.success('Poll deleted');
      if (onDelete) onDelete(poll._id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete poll');
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/poll/${poll._id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  return (
    <div className="glass p-5 flex flex-col gap-4 hover:border-primary-500/30 transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <Link
          to={`/poll/${poll._id}`}
          className="flex-1 min-w-0 font-semibold text-white group-hover:text-primary-400 transition-colors line-clamp-2 leading-snug"
        >
          {poll.title}
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          {poll.settings?.password && <Lock size={13} className="text-amber-400" />}
          <span className={isClosed ? 'badge-red' : 'badge-green'}>
            {isClosed ? 'Closed' : 'Active'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-white/50">
        <span className="flex items-center gap-1.5">
          <Users size={13} className="text-primary-400" />
          {poll.totalVotes} votes
        </span>
        <span className="flex items-center gap-1.5 capitalize">
          <BarChart2 size={13} className="text-accent-400" />
          {poll.type}
        </span>
        {poll.settings?.deadline && (
          <span className="flex items-center gap-1.5">
            <Clock size={13} className={isExpired ? 'text-red-400' : 'text-white/40'} />
            {isExpired ? 'Expired' : new Date(poll.settings.deadline).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Mini progress for top option */}
      {poll.options && poll.totalVotes > 0 && (() => {
        const top = poll.options.reduce((a, b) => (a.votes > b.votes ? a : b));
        const pct = Math.round((top.votes / poll.totalVotes) * 100);
        return (
          <div>
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>Leading: {top.text}</span>
              <span>{pct}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })()}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        <Link
          to={`/poll/${poll._id}`}
          className="flex-1 text-center text-xs font-medium text-primary-400 hover:text-primary-300 py-1.5 rounded-lg hover:bg-primary-500/10 transition-all"
        >
          View Poll →
        </Link>
        <button
          onClick={handleCopyLink}
          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          title="Copy link"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={handleDuplicate}
          className="p-1.5 text-white/40 hover:text-accent-400 hover:bg-accent-500/10 rounded-lg transition-all"
          title="Duplicate poll"
        >
          <BarChart2 size={14} />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
          title="Delete poll"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default PollCard;
