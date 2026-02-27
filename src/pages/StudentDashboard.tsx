import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart
} from 'recharts';
import { useAuthStore } from '../store/useStore';
import { 
  TrendingUp, 
  Clock, 
  Award, 
  ChevronRight, 
  ArrowUpRight,
  Target,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';

const radarData = [
  { subject: 'Aptitude', A: 85, fullMark: 100 },
  { subject: 'Coding', A: 70, fullMark: 100 },
  { subject: 'Soft Skills', A: 90, fullMark: 100 },
  { subject: 'Resume', A: 75, fullMark: 100 },
];

const trendData = [
  { name: 'Jan', score: 65 },
  { name: 'Feb', score: 72 },
  { name: 'Mar', score: 68 },
  { name: 'Apr', score: 85 },
  { name: 'May', score: 82 },
  { name: 'Jun', score: 90 },
];

const pastTests = [
  { company: 'Google', score: 88, date: '2 days ago', status: 'Completed' },
  { company: 'Amazon', score: 76, date: '1 week ago', status: 'Completed' },
  { company: 'Microsoft', score: 92, date: '2 weeks ago', status: 'Completed' },
];

const recommended = [
  { company: 'Netflix', difficulty: 'Hard', category: 'Backend' },
  { company: 'Stripe', difficulty: 'Medium', category: 'Fullstack' },
];

export default function StudentDashboard() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Welcome back, {user?.name}! 👋</h1>
          <p className="text-zinc-500 mt-1">Here's how you're performing across your interview prep.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">Global Rank</p>
              <p className="text-lg font-bold text-zinc-900">#1,240</p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">Badges</p>
              <p className="text-lg font-bold text-zinc-900">12</p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar Chart */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" />
              Skill Distribution
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e4e4e7" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 12 }} />
                <Radar
                  name="Skills"
                  dataKey="A"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Performance Trend
            </h3>
            <select className="bg-zinc-50 border-none text-sm font-medium rounded-lg px-3 py-1.5 focus:ring-0">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Past Tests */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Recent Activity
            </h3>
            <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">View All</button>
          </div>
          <div className="divide-y divide-zinc-100">
            {pastTests.map((test, i) => (
              <div key={i} className="p-4 hover:bg-zinc-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center font-bold text-zinc-400">
                    {test.company.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-zinc-900">{test.company}</p>
                    <p className="text-xs text-zinc-500">{test.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-zinc-900">{test.score}%</p>
                  <p className="text-xs text-emerald-600 font-medium">{test.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended */}
        <div className="bg-zinc-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Zap className="w-32 h-32" />
          </div>
          <h3 className="text-xl font-bold mb-6 relative z-10">Recommended for You</h3>
          <div className="space-y-4 relative z-10">
            {recommended.map((rec, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl hover:bg-white/20 transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">{rec.category}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/20">{rec.difficulty}</span>
                </div>
                <p className="font-bold text-lg mb-1">{rec.company} Mock Interview</p>
                <div className="flex items-center text-xs text-zinc-400 gap-1 group-hover:text-white transition-colors">
                  Start Now <ArrowUpRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
            Explore All Tests
          </button>
        </div>
      </div>
    </div>
  );
}
