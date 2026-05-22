import { useState, useEffect } from 'react';
import { Trash2, Users, BarChart3, Activity, Server, Search, RefreshCw, ShieldCheck } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [polls, setPolls] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('polls');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 15;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, pollsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get(`/admin/polls?page=${page}&limit=${LIMIT}&search=${search}`),
        api.get('/admin/users')
      ]);
      setStats(statsRes.data.stats);
      setPolls(pollsRes.data.polls);
      setTotalPages(pollsRes.data.pagination?.pages || 1);
      setUsers(usersRes.data.users);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, search]);

  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Force-delete this poll permanently?')) return;
    try {
      await api.delete(`/admin/polls/${pollId}`);
      setPolls((prev) => prev.filter((p) => p._id !== pollId));
      toast.success('Poll deleted by admin');
      fetchData(); // refresh stats
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role: newRole } : u));
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 MB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <ShieldCheck size={28} className="text-primary-400" />
            Admin Panel
          </h1>
          <p className="text-white/50 mt-1">Monitor and manage all platform activity</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="btn-ghost text-sm"
          id="admin-refresh"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'Total Polls', value: stats.totalPolls, icon: BarChart3, color: 'text-primary-400' },
            { label: 'Active Polls', value: stats.activePolls, icon: Activity, color: 'text-accent-400' },
            { label: 'Closed Polls', value: stats.closedPolls, icon: BarChart3, color: 'text-white/50' },
            { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-purple-400' },
            { label: 'Total Votes', value: stats.totalVotes?.toLocaleString(), icon: BarChart3, color: 'text-amber-400' },
            { label: 'DB Status', value: stats.dbState, icon: Server, color: stats.dbState === 'Connected' ? 'text-accent-400' : 'text-red-400' }
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="stat-card">
              <Icon size={16} className={color} />
              <div className="text-xl font-black text-white">{value}</div>
              <div className="text-xs text-white/40 leading-tight">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Server info */}
      {stats && (
        <div className="glass p-4 mb-6 flex flex-wrap gap-6 text-sm text-white/50">
          <span>🕒 Uptime: <span className="text-white/70">{formatUptime(stats.uptime)}</span></span>
          <span>💾 Heap: <span className="text-white/70">{formatBytes(stats.memory?.heapUsed)}</span></span>
          <span>📦 RSS: <span className="text-white/70">{formatBytes(stats.memory?.rss)}</span></span>
        </div>
      )}

      {/* Tab switch */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 w-fit mb-6">
        {['polls', 'users'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t ? 'bg-primary-500 text-white' : 'text-white/50 hover:text-white'
            }`}
            id={`admin-tab-${t}`}
          >
            {t === 'polls' ? `Polls (${polls.length})` : `Users (${users.length})`}
          </button>
        ))}
      </div>

      {/* ── Polls Tab ── */}
      {tab === 'polls' && (
        <>
          {/* Search */}
          <div className="relative mb-4 max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search polls by title..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-10 text-sm"
              id="admin-search"
            />
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 glass shimmer rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="glass overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-white/50 font-medium">Title</th>
                    <th className="text-left px-4 py-3 text-white/50 font-medium hidden md:table-cell">Creator</th>
                    <th className="text-center px-4 py-3 text-white/50 font-medium">Votes</th>
                    <th className="text-center px-4 py-3 text-white/50 font-medium">Status</th>
                    <th className="text-center px-4 py-3 text-white/50 font-medium hidden lg:table-cell">Created</th>
                    <th className="text-center px-4 py-3 text-white/50 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {polls.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-white/30">No polls found</td>
                    </tr>
                  ) : (
                    polls.map((poll) => {
                      const isClosed = poll.isClosed || (poll.settings?.deadline && new Date() > new Date(poll.settings.deadline));
                      return (
                        <tr key={poll._id} className="hover:bg-white/3 transition-colors">
                          <td className="px-4 py-3">
                            <a
                              href={`/poll/${poll._id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-white/80 hover:text-primary-400 transition-colors font-medium line-clamp-1"
                            >
                              {poll.title}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-white/50 hidden md:table-cell">
                            {poll.creator?.name || <span className="text-white/20">Guest</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-white/70">{poll.totalVotes}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={isClosed ? 'badge-red' : 'badge-green'}>
                              {isClosed ? 'Closed' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-white/40 hidden lg:table-cell">
                            {new Date(poll.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleDeletePoll(poll._id)}
                              className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Force delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t border-white/10">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-30"
                  >
                    ← Prev
                  </button>
                  <span className="text-white/50 text-sm">Page {page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-30"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Users Tab ── */}
      {tab === 'users' && (
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-white/50 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium hidden md:table-cell">Email</th>
                <th className="text-center px-4 py-3 text-white/50 font-medium hidden lg:table-cell">Department</th>
                <th className="text-center px-4 py-3 text-white/50 font-medium">Polls</th>
                <th className="text-center px-4 py-3 text-white/50 font-medium">Role</th>
                <th className="text-center px-4 py-3 text-white/50 font-medium hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-white/30">No users found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold flex items-center justify-center">
                          {user.name[0].toUpperCase()}
                        </div>
                        <span className="text-white/80 font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/50 hidden md:table-cell">{user.email}</td>
                    <td className="px-4 py-3 text-center text-white/40 hidden lg:table-cell">
                      {user.department || '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-white/60">{user.polls?.length || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-lg border bg-transparent transition-colors cursor-pointer ${
                          user.role === 'admin'
                            ? 'border-amber-500/40 text-amber-400'
                            : 'border-white/20 text-white/60'
                        }`}
                      >
                        <option value="user" className="bg-surface-900">user</option>
                        <option value="admin" className="bg-surface-900">admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center text-white/40 hidden lg:table-cell">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
