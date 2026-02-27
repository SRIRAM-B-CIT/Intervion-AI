"use client";

import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart
} from 'recharts';
import { useAuthStore } from '../store/useStore';
import { 
  TrendingUp, 
  Clock, 
  ArrowUpRight,
  Target,
  Zap,
  LayoutDashboard
} from 'lucide-react';
import { motion } from 'framer-motion';

const radarData = [
  { subject: 'Aptitude', A: 85, fullMark: 100 },
  { subject: 'Coding', A: 45, fullMark: 100 }, // Example of a lower score affecting color
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

  /**
   * Helper to determine color based on performance average
   * Red: < 50, Yellow: 50-75, Green: > 75
   */
  const getPerformanceTheme = (data: any[]) => {
    const avg = data.reduce((acc, curr) => acc + curr.A, 0) / data.length;
    if (avg < 50) return { stroke: "#ef4444", fill: "#ef4444", label: "Poor" };
    if (avg <= 75) return { stroke: "#eab308", fill: "#eab308", label: "Average" };
    return { stroke: "#10b981", fill: "#10b981", label: "Excellent" };
  };

  const theme = getPerformanceTheme(radarData);

  return (
    <div className="space-y-8 p-4">
      {/* Updated Welcome Header - Removed Rank/Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Sudheesh'}! 👋
          </h1>
          <p className="text-zinc-500 mt-1 font-medium italic">
            "Your only limit is your mind."
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-zinc-100 shadow-sm">
          <LayoutDashboard className="text-emerald-500 w-5 h-5" />
          <span className="text-sm font-bold text-zinc-900 uppercase tracking-widest font-mono">Student Hub</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar Chart - Dynamic Colors applied here */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-white p-6 rounded-[32px] border border-zinc-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-zinc-400" />
              Skill Distribution
            </h3>
            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
              theme.label === "Poor" ? "bg-red-50 text-red-600 border-red-100" :
              theme.label === "Average" ? "bg-yellow-50 text-yellow-600 border-yellow-100" :
              "bg-emerald-50 text-emerald-600 border-emerald-100"
            }`}>
              {theme.label}
            </span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#f4f4f5" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} />
                <Radar
                  name="Skills"
                  dataKey="A"
                  stroke={theme.stroke}
                  fill={theme.fill}
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Performance Trend Area Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-zinc-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Performance Trend
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Activity and Recommendations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-50 flex items-center justify-between">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Recent Activity
            </h3>
            <button className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1 rounded-lg transition-all tracking-widest">HISTORY</button>
          </div>
          <div className="divide-y divide-zinc-50">
            {pastTests.map((test, i) => (
              <div key={i} className="p-5 hover:bg-zinc-50/50 transition-colors flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center font-black text-zinc-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    {test.company.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">{test.company} Mock</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{test.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-zinc-900">{test.score}%</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">{test.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Mock Card */}
        <div className="bg-[#0D121F] rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Zap className="w-40 h-40" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-black mb-6 tracking-tight">AI Recommended</h3>
            <div className="space-y-4">
              {recommended.map((rec, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400">{rec.category}</span>
                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 uppercase font-black">{rec.difficulty}</span>
                  </div>
                  <p className="font-bold text-base mb-2">{rec.company} Practice</p>
                  <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">
                    Start Session <ArrowUpRight className="ml-2 w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className="relative z-10 w-full mt-8 bg-emerald-500 text-[#0D121F] py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
            Launch Marathon
          </button>
        </div>
      </div>
    </div>
  );
}