"use client";

import React, { useState } from 'react';
import { useAppStore } from '../store/useStore';
import { useCmsStore } from '../store/useCmsStore';
import { 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  Upload, 
  Brain, 
  Code, 
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  RefreshCcw,
  Layout,
  Zap,
  Users,
  Code2, 
  AlertCircle // <-- Added missing icons here
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ResumeAnalyzer from './ResumeAnalyzer';
import CodingLab from './CodingLab';
import HRInterview from './HRInterview';
import AptitudeTest from './AptitudeTest';
import GroupDiscussion from './GroupDiscussion';

// ==========================================
// BEAUTIFUL FEEDBACK COMPONENT
// ==========================================
const BeautifulFeedback = ({ rawText }: { rawText: string }) => {
  if (!rawText) return null;

  // Split feedback into blocks (This handles the "---" separation between Coding Lab questions)
  const blocks = rawText.split('---').filter(b => b.trim() !== '');

  // Safe bold text formatter
  const formatBoldText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => 
      i % 2 === 1 ? <strong key={i} className="font-black text-inherit">{part}</strong> : <span key={i}>{part}</span>
    );
  };

  return (
    <div className="space-y-8 w-full text-left mt-6">
      {blocks.map((block, index) => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l !== '');
        
        let title = '';
        let subtitle = '';
        let didSection: string[] = [];
        let expectedSection: string[] = [];
        let currentMode: 'did' | 'expected' | 'intro' = 'intro';

        lines.forEach(line => {
          // Identify headers
          if (line.startsWith('### ')) {
            title = line.replace('### ', '');
            return;
          }
          if (line.startsWith('**Score:')) {
            subtitle = line.replace(/\*\*/g, '');
            return;
          }
          
          if (line.toLowerCase().includes('what you did')) {
            currentMode = 'did';
            return;
          }
          if (line.toLowerCase().includes('what is expected')) {
            currentMode = 'expected';
            return;
          }

          // Clean up markdown bullet points
          const cleanLine = line.replace(/^[-*]\s*/, '');

          if (currentMode === 'did') didSection.push(cleanLine);
          else if (currentMode === 'expected') expectedSection.push(cleanLine);
          else if (!title && !line.includes('What You Did')) {
            title = cleanLine; 
          }
        });

        return (
          <div key={index} className="bg-white rounded-[32px] border border-zinc-200 shadow-sm overflow-hidden">
            
            {/* Header (Title & Score) */}
            {(title || subtitle) && (
              <div className="bg-zinc-50 border-b border-zinc-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h4 className="font-black text-zinc-900 text-lg flex items-center gap-3">
                  <Code2 className="text-indigo-500" size={24} />
                  {title || `Review Section ${index + 1}`}
                </h4>
                {subtitle && (
                  <span className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase shadow-sm">
                    {subtitle}
                  </span>
                )}
              </div>
            )}

            <div className="p-6 md:p-8 space-y-6">
              {/* RED BOX: Mistakes & Observations */}
              {didSection.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-[24px] p-6">
                  <h5 className="text-red-600 font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                    <AlertCircle size={16} /> What You Did 
                  </h5>
                  <ul className="space-y-3">
                    {didSection.map((point, i) => (
                      <li key={i} className="text-sm text-red-900 flex items-start gap-3 leading-relaxed font-medium">
                        <span className="text-red-400 mt-0.5 shrink-0">•</span>
                        <span>{formatBoldText(point)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* GREEN BOX: Ideal Approach */}
              {expectedSection.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-[24px] p-6">
                  <h5 className="text-emerald-600 font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                    <CheckCircle2 size={16} /> What Is Expected
                  </h5>
                  <ul className="space-y-3">
                    {expectedSection.map((point, i) => (
                      <li key={i} className="text-sm text-emerald-900 flex items-start gap-3 leading-relaxed font-medium">
                        <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                        <span>{formatBoldText(point)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==========================================
// MAIN MOCK MARATHON COMPONENT
// ==========================================
export default function MockMarathon() {
  const { companies } = useCmsStore();
  const { currentSession, startSession, nextRound, viewFeedback, resetSession } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');

  const selectedCompany = companies.find(c => c.id === currentSession?.companyId);
  const currentRound = selectedCompany?.workflow[currentSession?.currentRoundIndex || 0];

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!currentSession) {
    return (
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight">Select Your Target Company</h1>
          <p className="text-zinc-500 mt-2 font-medium">Choose a company to start your personalized Interview Marathon.</p>
        </div>

        <div className="space-y-6">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search for a company (e.g. Google, Microsoft)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-lg shadow-sm font-medium outline-none"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <motion.button
                key={company.id}
                whileHover={{ y: -4 }}
                onClick={() => startSession(company.id)}
                className="bg-white p-8 rounded-[32px] border border-zinc-200 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all text-left group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Building2 className="w-24 h-24" />
                </div>
                <div className="w-16 h-16 rounded-2xl bg-zinc-50 p-3 mb-6 group-hover:bg-emerald-50 transition-colors relative z-10 border border-zinc-100">
                  <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
                </div>
                <h3 className="text-2xl font-black text-zinc-900 mb-2 relative z-10 tracking-tight">{company.name}</h3>
                <p className="text-sm text-zinc-500 line-clamp-2 mb-6 relative z-10">{company.description}</p>
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm relative z-10 uppercase tracking-widest">
                  Start Marathon <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (currentSession.isTerminated) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-8 py-20">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto border-4 border-red-100">
          <AlertTriangle className="w-12 h-12 text-red-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Marathon Terminated</h2>
          <p className="text-zinc-500 font-medium">Multiple security violations detected. Your session has been automatically closed for integrity reasons.</p>
        </div>
        <button 
          onClick={resetSession}
          className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 active:scale-95"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const renderRoundContent = () => {
    if (currentSession.isRoundSubmitted && !currentSession.isFeedbackViewed) {
      return (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white p-10 rounded-[40px] border border-zinc-200 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Round Review</h3>
                  <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1">AI-Generated Feedback</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-emerald-600">{currentSession.scores[currentSession.currentRoundIndex]}%</p>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Score</p>
              </div>
            </div>

            {/* This is where the Beautiful Feedback Component is used */}
            <div className="bg-zinc-50/80 p-8 rounded-[32px] border border-zinc-100 shadow-inner">
              <BeautifulFeedback rawText={currentSession.roundFeedback || ''} />
            </div>

            <button 
              onClick={viewFeedback}
              className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-zinc-900/10 active:scale-95"
            >
              Proceed to Next Round
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      );
    }

    if (currentSession.isRoundSubmitted && currentSession.isFeedbackViewed) {
      const isLastRound = currentSession.currentRoundIndex === (selectedCompany?.workflow.length || 0) - 1;
      
      if (isLastRound) {
        return (
          <div className="max-w-2xl mx-auto text-center space-y-8 py-20">
            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-100">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Marathon Completed!</h2>
              <p className="text-zinc-500 font-medium">Congratulations! You've successfully navigated all rounds for {selectedCompany?.name}.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Avg Score</p>
                <p className="text-3xl font-black text-emerald-600">
                  {Math.round(Object.values(currentSession.scores).reduce((a, b) => a + b, 0) / Object.values(currentSession.scores).length)}%
                </p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Rounds</p>
                <p className="text-3xl font-black text-zinc-900">{selectedCompany?.workflow.length}</p>
              </div>
            </div>
            <button 
              onClick={resetSession}
              className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 active:scale-95"
            >
              Finish & Exit
            </button>
          </div>
        );
      }

      return (
        <div className="text-center py-20 space-y-6">
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-100">
            <RefreshCcw className="w-10 h-10 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-zinc-900 tracking-tight">Ready for the next round?</h3>
            <p className="text-zinc-500 font-medium text-lg">Next up: <span className="font-bold text-emerald-600 uppercase tracking-widest">{selectedCompany?.workflow[currentSession.currentRoundIndex + 1].type}</span></p>
          </div>
          <button 
            onClick={nextRound}
            className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
          >
            Start Next Round
          </button>
        </div>
      );
    }

    // Render current round content
    switch (currentRound?.type) {
      case 'resume': return <ResumeAnalyzer />;
      case 'coding': return <CodingLab />;
      case 'hr': return <HRInterview />;
      case 'aptitude': return <AptitudeTest />;
      case 'gd': return <GroupDiscussion />; 
      
      default:
        return (
          <div className="text-center py-20">
            <Layout className="w-16 h-16 text-zinc-300 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Round Not Implemented</h3>
            <p className="text-zinc-500 mt-2 font-medium">This round type ({currentRound?.type}) is under development.</p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white border border-zinc-200 p-3 shadow-sm">
            <img src={selectedCompany?.logo} alt="" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">{selectedCompany?.name} Marathon</h1>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">{selectedCompany?.targetRole}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {currentSession.warnings > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Warning {currentSession.warnings}/3</span>
            </div>
          )}
          <button 
            onClick={() => {
              if (confirm('Are you sure you want to quit? Your progress will be reset.')) {
                resetSession();
              }
            }}
            className="px-6 py-3 bg-zinc-100 text-zinc-500 rounded-2xl hover:bg-red-50 hover:text-red-600 font-black text-[10px] uppercase tracking-widest transition-colors"
          >
            Quit Session
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="relative px-4 md:px-10">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-zinc-100 -translate-y-1/2 rounded-full" />
        <div className="relative flex justify-between">
          {selectedCompany?.workflow.map((round, idx) => {
            const isCompleted = currentSession.currentRoundIndex > idx;
            const isActive = currentSession.currentRoundIndex === idx;
            
            const Icon = round.type === 'resume' ? Upload : 
                         round.type === 'aptitude' ? Brain :
                         round.type === 'coding' ? Code :
                         round.type === 'hr' ? MessageSquare : 
                         round.type === 'gd' ? Users : Layout; 

            return (
              <div key={round.id} className="flex flex-col items-center gap-4 bg-[#f8fafc] px-2 md:px-4">
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center border-[3px] transition-all relative z-10",
                  isCompleted ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" :
                  isActive ? "bg-white border-emerald-500 text-emerald-600 shadow-xl shadow-emerald-500/20 scale-110" :
                  "bg-white border-zinc-200 text-zinc-300"
                )}>
                  {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest hidden md:block",
                  isActive ? "text-emerald-600" : isCompleted ? "text-zinc-900" : "text-zinc-300"
                )}>
                  {round.type}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white border border-zinc-200 shadow-sm p-2 md:p-8 rounded-[40px] min-h-[600px] relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentSession.currentRoundIndex}-${currentSession.isRoundSubmitted}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderRoundContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Building2(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}