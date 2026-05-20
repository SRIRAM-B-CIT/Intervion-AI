"use client";

import React, { useMemo } from 'react';
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
  LayoutDashboard,
  Inbox,
  LineChart as LineChartIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentDashboard() {
  const { user } = useAuthStore();

  // 1. DATA LOGIC: Distinguish between Demo User and New Sign-up
  // If the name is 'Sudheesh' or 'Admin', we show the mock data.
  // If it's a new name from Sign Up, we show the empty states.
  const isDemoUser = user?.name === 'Sudheesh' || user?.name === 'Admin';
  const hasHistory = isDemoUser; 

  const radarData = useMemo(() => {
    if (!hasHistory) {
      return [
        { subject: 'Aptitude', A: 0, fullMark: 100 },
        { subject: 'Coding', A: 0, fullMark: 100 },
        { subject: 'Soft Skills', A: 0, fullMark: 100 },
        { subject: 'Resume', A: 0, fullMark: 100 },
      ];
    }
    // Default values for Sign-In / Demo
    return [
      { subject: 'Aptitude', A: 85, fullMark: 100 },
      { subject: 'Coding', A: 45, fullMark: 100 },
      { subject: 'Soft Skills', A: 90, fullMark: 100 },
      { subject: 'Resume', A: 75, fullMark: 100 },
    ];
  }, [hasHistory]);

  const trendData = hasHistory ? [
    { name: 'Jan', score: 65 },
    { name: 'Feb', score: 72 },
    { name: 'Mar', score: 68 },
    { name: 'Apr', score: 85 },
    { name: 'May', score: 82 },
    { name: 'Jun', score: 90 },
  ] : [];

  const pastTests = hasHistory ? [
    { company: 'Google', score: 88, date: '2 days ago', status: 'Completed' },
    { company: 'Amazon', score: 76, date: '1 week ago', status: 'Completed' },
    { company: 'Microsoft', score: 92, date: '2 weeks ago', status: 'Completed' },
  ] : [];

  const recommended = [
    { company: 'Netflix', difficulty: 'Hard', category: 'Backend' },
    { company: 'Stripe', difficulty: 'Medium', category: 'Fullstack' },
  ];

  // 2. THEME LOGIC: Handles "Not Assessed" state for new sign-ups
  const getPerformanceTheme = (data: any[]) => {
    const avg = data.reduce((acc, curr) => acc + curr.A, 0) / data.length;
    
    if (avg === 0) return { stroke: "#e4e4e7", fill: "#f4f4f5", label: "Not Assessed", color: "text-zinc-500", border: "border-zinc-200", bg: "bg-zinc-50" };
    if (avg < 50) return { stroke: "#ef4444", fill: "#ef4444", label: "Poor", color: "text-red-600", border: "border-red-100", bg: "bg-red-50" };
    if (avg <= 75) return { stroke: "#eab308", fill: "#eab308", label: "Average", color: "text-yellow-600", border: "border-yellow-100", bg: "bg-yellow-50" };
    
    return { stroke: "#10b981", fill: "#10b981", label: "Excellent", color: "text-emerald-600", border: "border-emerald-100", bg: "bg-emerald-50" };
  };

  const theme = getPerformanceTheme(radarData);

  return (
    <div className="space-y-8 p-4">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 👋
          </h1>
          <p className="text-zinc-500 mt-1 font-medium italic">
            {hasHistory ? '"Your only limit is your mind."' : 'Ready to take your first mock interview?'}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-zinc-100 shadow-sm">
          <LayoutDashboard className="text-emerald-500 w-5 h-5" />
          <span className="text-sm font-bold text-zinc-900 uppercase tracking-widest font-mono">Student Hub</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar Chart */}
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
            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${theme.bg} ${theme.color} ${theme.border}`}>
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
                  fillOpacity={hasHistory ? 0.3 : 0.8}
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
          <div className="h-[300px] w-full flex items-center justify-center">
            {hasHistory ? (
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
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100">
                  <LineChartIcon className="w-8 h-8 text-zinc-300" />
                </div>
                <h4 className="text-zinc-900 font-bold">No Data Available</h4>
                <p className="text-zinc-500 text-sm mt-1">Complete a mock interview to see your trend.</p>
              </div>
            )}
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
            {hasHistory && (
              <button className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1 rounded-lg transition-all tracking-widest">
                HISTORY
              </button>
            )}
          </div>
          <div className="divide-y divide-zinc-50">
            {hasHistory ? (
              pastTests.map((test, i) => (
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
              ))
            ) : (
              <div className="p-16 text-center">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100">
                  <Inbox className="w-10 h-10 text-zinc-200" />
                </div>
                <h4 className="text-zinc-900 font-bold text-lg">Your inbox is empty</h4>
                <p className="text-zinc-500 text-sm max-w-[240px] mx-auto mt-2">
                  Take your first AI interview to start building your placement portfolio.
                </p>
              </div>
            )}
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
            {hasHistory ? "Launch Marathon" : "Start First Session"}
          </button>
        </div>
      </div>
    </div>
  );
}