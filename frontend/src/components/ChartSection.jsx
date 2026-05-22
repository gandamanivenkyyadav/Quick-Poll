import { useState, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar, Doughnut } from 'react-chartjs-2';
import { PieChart, BarChart2, Donut } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316'
];

const CHART_TYPES = [
  { id: 'bar', label: 'Bar', Icon: BarChart2 },
  { id: 'pie', label: 'Pie', Icon: PieChart },
  { id: 'doughnut', label: 'Donut', Icon: Donut }
];

const ChartSection = ({ poll }) => {
  const [chartType, setChartType] = useState('bar');

  const chartData = useMemo(() => ({
    labels: poll.options.map((o) => o.text),
    datasets: [
      {
        label: 'Votes',
        data: poll.options.map((o) => o.votes || 0),
        backgroundColor: CHART_COLORS.map((c) => c + 'cc'), // with transparency
        borderColor: CHART_COLORS,
        borderWidth: 2,
        borderRadius: chartType === 'bar' ? 8 : undefined,
        hoverBorderWidth: 3
      }
    ]
  }), [poll, chartType]);

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'Inter', size: 12 }, padding: 16 }
      },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.95)',
        titleColor: '#fff',
        bodyColor: 'rgba(255,255,255,0.7)',
        borderColor: 'rgba(99,102,241,0.3)',
        borderWidth: 1,
        cornerRadius: 10,
        callbacks: {
          label: (ctx) => {
            const total = poll.totalVotes || 1;
            const pct = ((ctx.raw / total) * 100).toFixed(1);
            return ` ${ctx.raw} votes (${pct}%)`;
          }
        }
      }
    }
  };

  const barOptions = {
    ...baseOptions,
    indexAxis: 'y',
    scales: {
      x: {
        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'Inter' } },
        grid: { color: 'rgba(255,255,255,0.05)' },
        beginAtZero: true
      },
      y: {
        ticks: { color: 'rgba(255,255,255,0.7)', font: { family: 'Inter', size: 12 } },
        grid: { display: false }
      }
    }
  };

  return (
    <div className="glass p-6">
      {/* Chart type switcher */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Live Results</h3>
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
          {CHART_TYPES.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setChartType(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                chartType === id
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart render */}
      <div className="flex justify-center">
        {poll.totalVotes === 0 ? (
          <div className="text-center py-12 text-white/30">
            <div className="text-4xl mb-3">📊</div>
            <p>No votes yet — be the first!</p>
          </div>
        ) : (
          <div className={chartType === 'bar' ? 'w-full' : 'max-w-xs w-full'}>
            {chartType === 'bar' && <Bar data={chartData} options={barOptions} />}
            {chartType === 'pie' && <Pie data={chartData} options={baseOptions} />}
            {chartType === 'doughnut' && <Doughnut data={chartData} options={baseOptions} />}
          </div>
        )}
      </div>

      {/* Vote percentage bars */}
      <div className="mt-6 space-y-3">
        {poll.options.map((option, idx) => {
          const pct = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
          const isWinner = poll.isClosed && option.votes === Math.max(...poll.options.map((o) => o.votes));
          return (
            <div key={idx} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium flex items-center gap-2 ${isWinner ? 'text-accent-400' : 'text-white/80'}`}>
                  {isWinner && <span className="text-base">🏆</span>}
                  {option.text}
                </span>
                <span className="text-sm text-white/50">
                  {option.votes} <span className="text-white/30">({pct}%)</span>
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${isWinner ? 'from-accent-500 to-accent-400' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChartSection;
