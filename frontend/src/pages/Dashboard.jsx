import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BarChart3, Clock, Users, TrendingUp } from 'lucide-react';
import api from '../utils/api';
import PollCard from '../components/PollCard';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TABS = ['All', 'Active', 'Closed'];

const Dashboard = () => {
  const { user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const res = await api.get('/polls/creator/mine');
        setPolls(res.data.polls);
      } catch {
        toast.error('Failed to load your polls');
      } finally {
        setLoading(false);
      }
    };
    fetchPolls();
  }, []);

  const filteredPolls = polls.filter((p) => {
    const isExpired = p.settings?.deadline && new Date() > new Date(p.settings.deadline);
    const isClosed = p.isClosed || isExpired;
    if (activeTab === 'Active') return !isClosed;
    if (activeTab === 'Closed') return isClosed;
    return true;
  });

  const handleDelete = (pollId) => setPolls((prev) => prev.filter((p) => p._id !== pollId));
  const handleDuplicate = (newPoll) => setPolls((prev) => [newPoll, ...prev]);

  // Compute stats
  const totalVotes = polls.reduce((sum, p) => sum + (p.totalVotes || 0), 0);
  const activeCount = polls.filter((p) => !p.isClosed && !(p.settings?.deadline && new Date() > new Date(p.settings.deadline))).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Dashboard</h1>
          <p className="text-white/50 mt-1">Welcome back, <span className="text-primary-400">{user?.name}</span></p>
        </div>
        <Link to="/create" className="btn-primary" id="dashboard-create-btn">
          <Plus size={16} />
          New Poll
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Polls', value: polls.length, icon: BarChart3, color: 'text-primary-400' },
          { label: 'Active Polls', value: activeCount, icon: TrendingUp, color: 'text-accent-400' },
          { label: 'Total Votes', value: totalVotes.toLocaleString(), icon: Users, color: 'text-purple-400' },
          { label: 'Avg. Votes/Poll', value: polls.length ? Math.round(totalVotes / polls.length) : 0, icon: Clock, color: 'text-amber-400' }
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <Icon size={20} className={color} />
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-xs text-white/40">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 w-fit mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-primary-500 text-white shadow'
                : 'text-white/50 hover:text-white'
            }`}
            id={`tab-${tab.toLowerCase()}`}
          >
            {tab}
            <span className={`ml-1.5 text-xs ${activeTab === tab ? 'text-primary-200' : 'text-white/30'}`}>
              {tab === 'All' ? polls.length
                : tab === 'Active' ? polls.filter((p) => !p.isClosed && !(p.settings?.deadline && new Date() > new Date(p.settings.deadline))).length
                : polls.filter((p) => p.isClosed || (p.settings?.deadline && new Date() > new Date(p.settings.deadline))).length}
            </span>
          </button>
        ))}
      </div>

      {/* Poll grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass p-5 h-48 shimmer" />
          ))}
        </div>
      ) : filteredPolls.length === 0 ? (
        <div className="text-center glass p-16">
          <div className="text-5xl mb-4">🗳️</div>
          <h3 className="text-xl font-bold text-white mb-2">
            {activeTab === 'All' ? 'No polls yet' : `No ${activeTab.toLowerCase()} polls`}
          </h3>
          <p className="text-white/40 mb-6">Create your first poll and share it with your team.</p>
          <Link to="/create" className="btn-primary">
            <Plus size={16} />
            Create First Poll
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolls.map((poll) => (
            <PollCard
              key={poll._id}
              poll={poll}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
