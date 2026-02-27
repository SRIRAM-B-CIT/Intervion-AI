import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  ExternalLink,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Mail,
  Phone,
  Calendar,
  ChevronRight,
  Target,
  Layout,
  Brain,
  FileText
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useCmsStore } from '../store/useCmsStore';

const mockStudents = [
  {
    id: '1',
    name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    role: 'Frontend Architect',
    rounds: ['Resume', 'Aptitude', 'Coding', 'HR'],
    status: 'Completed',
    score: 88,
    date: '2024-03-15',
    avatar: 'https://picsum.photos/seed/alex/100/100',
    skills: [
      { subject: 'Aptitude', A: 85, fullMark: 100 },
      { subject: 'Coding', A: 92, fullMark: 100 },
      { subject: 'Soft Skills', A: 78, fullMark: 100 },
      { subject: 'Resume', A: 95, fullMark: 100 },
    ],
    history: [
      { name: 'Test 1', score: 65 },
      { name: 'Test 2', score: 72 },
      { name: 'Test 3', score: 88 },
    ]
  },
  {
    id: '2',
    name: 'Sarah Chen',
    email: 'sarah.c@example.com',
    role: 'Fullstack Engineer',
    rounds: ['Aptitude', 'Coding'],
    status: 'In Progress',
    score: 74,
    date: '2024-03-14',
    avatar: 'https://picsum.photos/seed/sarah/100/100',
    skills: [
      { subject: 'Aptitude', A: 70, fullMark: 100 },
      { subject: 'Coding', A: 85, fullMark: 100 },
      { subject: 'Soft Skills', A: 88, fullMark: 100 },
      { subject: 'Resume', A: 65, fullMark: 100 },
    ],
    history: [
      { name: 'Test 1', score: 55 },
      { name: 'Test 2', score: 74 },
    ]
  },
  {
    id: '3',
    name: 'Marcus Thorne',
    email: 'm.thorne@example.com',
    role: 'Backend Developer',
    rounds: ['Aptitude', 'Coding', 'HR'],
    status: 'Completed',
    score: 92,
    date: '2024-03-12',
    avatar: 'https://picsum.photos/seed/marcus/100/100',
    skills: [
      { subject: 'Aptitude', A: 95, fullMark: 100 },
      { subject: 'Coding', A: 88, fullMark: 100 },
      { subject: 'Soft Skills', A: 92, fullMark: 100 },
      { subject: 'Resume', A: 85, fullMark: 100 },
    ],
    history: [
      { name: 'Test 1', score: 82 },
      { name: 'Test 2', score: 85 },
      { name: 'Test 3', score: 92 },
    ]
  }
];

export default function AdminAnalytics() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<typeof mockStudents[0] | null>(null);
  const { companies } = useCmsStore();

  const filteredStudents = mockStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Candidates', value: '1,284', change: '+12%', icon: Users, color: 'emerald' },
          { label: 'Avg. Score', value: '76%', change: '+5%', icon: TrendingUp, color: 'blue' },
          { label: 'Tests Completed', value: '3,492', change: '+18%', icon: CheckCircle2, color: 'purple' },
          { label: 'Active Sessions', value: '42', change: '-3%', icon: Clock, color: 'orange' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[32px] border border-zinc-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-2xl font-bold text-zinc-900 mt-1">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-[40px] border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="p-3 rounded-2xl bg-zinc-50 text-zinc-600 hover:bg-zinc-100 transition-all">
              <Filter className="w-5 h-5" />
            </button>
            <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-900 text-white font-bold hover:bg-zinc-800 transition-all">
              <Download className="w-5 h-5" />
              Export Report
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50">
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-wider">Candidate</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-wider">Target Role</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-wider">Interview Rounds</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-wider">Score</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-wider">Date</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredStudents.map((student) => (
                <tr 
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className="hover:bg-zinc-50 transition-colors cursor-pointer group"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <img src={student.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                      <div>
                        <p className="font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">{student.name}</p>
                        <p className="text-xs text-zinc-500">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-bold text-zinc-700">{student.role}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                      {student.rounds.map((round, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-zinc-100 rounded-md text-[10px] font-bold text-zinc-500 uppercase">
                          {round}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      student.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        student.status === 'Completed' ? 'bg-emerald-500' : 'bg-orange-500'
                      }`} />
                      {student.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 w-16 bg-zinc-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            student.score >= 80 ? 'bg-emerald-500' : student.score >= 60 ? 'bg-blue-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${student.score}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-zinc-900">{student.score}%</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm text-zinc-500 font-medium">{student.date}</td>
                  <td className="px-8 py-6">
                    <button className="p-2 hover:bg-white rounded-lg transition-all border border-transparent hover:border-zinc-200">
                      <MoreVertical className="w-4 h-4 text-zinc-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-zinc-50 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 bg-white border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <img src={selectedStudent.avatar} alt="" className="w-20 h-20 rounded-[24px] border-4 border-zinc-50 shadow-lg" />
                  <div>
                    <h3 className="text-3xl font-bold text-zinc-900">{selectedStudent.name}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1.5 text-sm text-zinc-500 font-medium">
                        <Mail className="w-4 h-4" /> {selectedStudent.email}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-zinc-300" />
                      <span className="flex items-center gap-1.5 text-sm text-zinc-500 font-medium">
                        <Target className="w-4 h-4 text-emerald-500" /> {selectedStudent.role}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="p-3 hover:bg-zinc-100 rounded-full transition-all"
                >
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Charts */}
                  <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Skill Radar */}
                      <div className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm">
                        <h4 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                          <Brain className="w-5 h-5 text-emerald-500" />
                          Skill Analysis
                        </h4>
                        <div className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={selectedStudent.skills}>
                              <PolarGrid stroke="#f4f4f5" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 12, fontWeight: 600 }} />
                              <Radar
                                name={selectedStudent.name}
                                dataKey="A"
                                stroke="#10b981"
                                fill="#10b981"
                                fillOpacity={0.2}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Score Trend */}
                      <div className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm">
                        <h4 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-blue-500" />
                          Score Progression
                        </h4>
                        <div className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={selectedStudent.history}>
                              <defs>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                              <XAxis dataKey="name" hide />
                              <YAxis hide domain={[0, 100]} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="score" 
                                stroke="#3b82f6" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorScore)" 
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Test History */}
                    <div className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm">
                      <h4 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-500" />
                        Recent Test History
                      </h4>
                      <div className="space-y-4">
                        {mockStudents[0].history.map((test, i) => (
                          <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                <FileText className="w-5 h-5 text-zinc-400" />
                              </div>
                              <div>
                                <p className="font-bold text-zinc-900">{test.name}</p>
                                <p className="text-xs text-zinc-500 font-medium">Completed on March {10 + i}, 2024</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-600">{test.score}%</p>
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Final Score</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Info Cards */}
                  <div className="space-y-8">
                    <div className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm">
                      <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-6">Candidate Dossier</h4>
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">
                            <Users className="w-5 h-5 text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-400 font-bold uppercase">Applied Role</p>
                            <p className="font-bold text-zinc-900">{selectedStudent.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">
                            <Layout className="w-5 h-5 text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-400 font-bold uppercase">Interview Rounds</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedStudent.rounds.map((r, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-zinc-100 rounded text-[10px] font-bold text-zinc-600">
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-400 font-bold uppercase">Joined Date</p>
                            <p className="font-bold text-zinc-900">Jan 12, 2024</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-400 font-bold uppercase">Percentile</p>
                            <p className="font-bold text-zinc-900">Top 8%</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-900 p-8 rounded-[32px] text-white">
                      <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-6">Quick Actions</h4>
                      <div className="space-y-3">
                        <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                          <Mail className="w-4 h-4" />
                          Send Email
                        </button>
                        <button className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          View Resume
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
