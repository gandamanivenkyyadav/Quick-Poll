import { useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const CommentSection = ({ poll, setPoll }) => {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/polls/${poll._id}/comment`, {
        name: name.trim() || 'Anonymous',
        text: text.trim()
      });
      setText('');
      toast.success('Comment posted!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const comments = poll.comments || [];

  return (
    <div className="glass p-6 mt-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <MessageCircle size={18} className="text-primary-400" />
        Discussion
        <span className="ml-1 badge badge-blue">{comments.length}</span>
      </h3>

      {/* Comment list */}
      <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin mb-4">
        {comments.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-6">No comments yet. Start the discussion!</p>
        ) : (
          comments
            .slice()
            .reverse()
            .map((comment, idx) => (
              <div key={idx} className="flex gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
                <div className="w-8 h-8 shrink-0 rounded-full bg-primary-500/30 border border-primary-500/30 flex items-center justify-center text-primary-400 font-bold text-xs">
                  {comment.name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white/80">{comment.name}</span>
                    <span className="text-xs text-white/30">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-white/60 break-words">{comment.text}</p>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="input text-sm"
          id="comment-name"
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Write a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            required
            className="input text-sm flex-1"
            id="comment-text"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="btn-primary px-4 py-3 shrink-0"
            id="comment-submit"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentSection;
