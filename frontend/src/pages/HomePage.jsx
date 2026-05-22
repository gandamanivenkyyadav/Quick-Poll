import { Link } from 'react-router-dom';
import { ArrowRight, Zap, BarChart3, Share2, Shield, Clock, Users } from 'lucide-react';

const FEATURES = [
  { icon: Zap, title: 'Instant Creation', desc: 'Create a poll in seconds, no account needed. Share the link and start collecting votes.' },
  { icon: BarChart3, title: 'Live Results', desc: 'Watch votes roll in real-time with beautiful animated charts — Pie, Bar, or Donut.' },
  { icon: Share2, title: 'Easy Sharing', desc: 'Get a short link and QR code instantly. Share in Slack, Discord, or email.' },
  { icon: Shield, title: 'Spam Protection', desc: 'IP-based duplicate vote detection and rate limiting keeps your results clean.' },
  { icon: Clock, title: 'Smart Deadlines', desc: 'Set an expiry date and time. Polls close automatically when the deadline passes.' },
  { icon: Users, title: 'Team Ready', desc: 'Create a free account to manage all your polls, export data, and send webhooks.' }
];

const STEPS = [
  { n: '01', title: 'Create your poll', desc: 'Add your question, options, deadline and settings in under a minute.' },
  { n: '02', title: 'Share the link', desc: 'Copy the unique URL or scan the QR code to send it to your team.' },
  { n: '03', title: 'See live results', desc: 'Watch real-time charts update as each vote comes in. Export when ready.' }
];

const HomePage = () => {
  return (
    <div className="relative">
      {/* ─── Hero Section ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center bg-grid">
        {/* Background glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary-600/10 blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl animate-pulse-slow [animation-delay:2s]" />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-accent-500/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-400 text-sm font-medium mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
            Real-time voting · Live charts · Zero friction
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6 animate-slide-up leading-[1.1]">
            Polls that move at
            <br />
            <span className="text-gradient">team speed</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 animate-slide-up [animation-delay:0.1s]">
            Create polls with deadlines, share via one link, and watch live results
            pour in with beautiful charts — built for fast-moving teams.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up [animation-delay:0.2s]">
            <Link to="/create" id="hero-create-btn" className="btn-primary text-base px-8 py-4 shadow-2xl shadow-primary-900/60">
              Create a Free Poll
              <ArrowRight size={18} />
            </Link>
            <Link to="/register" className="btn-ghost text-base px-8 py-4">
              Create Account
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-8 text-sm text-white/30 animate-fade-in [animation-delay:0.4s]">
            No account required · Works on all devices · Completely free
          </p>

          {/* Floating chart preview card */}
          <div className="mt-16 max-w-2xl mx-auto glass p-6 text-left animate-float">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-white">🍕 What should we order for lunch?</h3>
                <p className="text-xs text-white/40 mt-0.5">Closes in 2 hours · 24 votes</p>
              </div>
              <span className="badge-green">Live</span>
            </div>
            {[
              { label: 'Pizza 🍕', pct: 46, votes: 11 },
              { label: 'Sushi 🍣', pct: 29, votes: 7 },
              { label: 'Tacos 🌮', pct: 17, votes: 4 },
              { label: 'Salad 🥗', pct: 8, votes: 2 }
            ].map((item) => (
              <div key={item.label} className="mb-3 last:mb-0">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/80">{item.label}</span>
                  <span className="text-white/40">{item.votes} votes · {item.pct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─────────────────────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-white mb-4">Everything your team needs</h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            From simple lunch votes to critical product decisions — Quick Poll handles it all.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass p-6 hover:border-primary-500/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-primary-500/15 border border-primary-500/20 flex items-center justify-center mb-4 group-hover:bg-primary-500/25 transition-colors">
                <Icon size={22} className="text-primary-400" />
              </div>
              <h3 className="font-semibold text-white text-lg mb-2">{title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-white/2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">How it works</h2>
            <p className="text-white/50">Three steps from idea to decision.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />

            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="text-center glass p-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-primary-900/40">
                  <span className="text-2xl font-black text-white">{n}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-white/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ────────────────────────────────────────────────────── */}
      <section className="py-24 max-w-4xl mx-auto px-4 text-center">
        <div className="glass p-12 bg-gradient-to-br from-primary-600/20 to-purple-600/10 border-primary-500/20">
          <h2 className="text-4xl font-black text-white mb-4">Ready to poll your team?</h2>
          <p className="text-white/60 mb-8 text-lg">No sign-up needed. Your first poll is just one click away.</p>
          <Link to="/create" className="btn-primary text-base px-10 py-4" id="bottom-create-btn">
            Create Your First Poll
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
