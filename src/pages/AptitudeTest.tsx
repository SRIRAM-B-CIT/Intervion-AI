"use client";

import React, { useState, useEffect } from 'react';
import { 
  Brain, Clock, ChevronRight, ChevronLeft, CheckCircle2, 
  AlertCircle, Loader2, Timer, Target, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCmsStore, AptitudeQuestion } from '../store/useCmsStore';
import { useAppStore } from '../store/useStore';
import { generateRoundFeedback } from '../services/geminiService';

// --- Fallback Dummy Data ---
const DUMMY_QUESTIONS: AptitudeQuestion[] = [
  { id: 'd1', qn: '1', question: 'If a train travels 60 miles in 45 minutes, what is its speed in miles per hour?', options: ['75 mph', '80 mph', '90 mph', '100 mph'], answer: '80 mph', topic: 'Mathematics' },
  { id: 'd2', qn: '2', question: 'Which number should come next in the pattern: 3, 9, 27, 81, ...?', options: ['162', '243', '216', '324'], answer: '243', topic: 'Logical Reasoning' },
  { id: 'd3', qn: '3', question: 'If all Z are Y, and some Y are X, which of the following must be true?', options: ['All Z are X', 'Some Z are X', 'Some Y are Z', 'No Z are X'], answer: 'Some Y are Z', topic: 'Syllogism' },
  { id: 'd4', qn: '4', question: 'A shirt originally costs $40. It is on sale for 20% off. What is the sale price?', options: ['$28', '$30', '$32', '$34'], answer: '$32', topic: 'Percentages' },
  { id: 'd5', qn: '5', question: 'OASIS is to SAND as ISLAND is to:', options: ['WATER', 'OCEAN', 'TREES', 'LAND'], answer: 'WATER', topic: 'Verbal Analogies' },
  { id: 'd6', qn: '6', question: 'If 5 machines take 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?', options: ['5 minutes', '100 minutes', '50 minutes', '1 minute'], answer: '5 minutes', topic: 'Quantitative Logic' },
  { id: 'd7', qn: '7', question: 'What is the probability of flipping two coins and getting two heads?', options: ['1/2', '1/3', '1/4', '1/8'], answer: '1/4', topic: 'Probability' },
  { id: 'd8', qn: '8', question: 'Find the odd one out:', options: ['Apple', 'Banana', 'Carrot', 'Potato'], answer: 'Potato', topic: 'Classification' },
  { id: 'd9', qn: '9', question: 'A person starts walking north, turns right, then turns right again. Which direction are they facing?', options: ['North', 'East', 'South', 'West'], answer: 'South', topic: 'Direction Sense' },
  { id: 'd10', qn: '10', question: 'If x + y = 10 and x - y = 4, what is the value of x * y?', options: ['21', '24', '16', '25'], answer: '21', topic: 'Algebra' },
];

export default function AptitudeTest() {
  const { globalAptitudeBank, companies } = useCmsStore();
  const { currentSession, submitRound } = useAppStore();
  
  const [questions, setQuestions] = useState<AptitudeQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Safely find the selected company for display purposes
  const selectedCompany = companies.find(c => c.id === currentSession?.companyId);

  useEffect(() => {
    // Prevent infinite loop by only running this setup once when questions array is empty
    if (questions.length > 0) return;

    let sourceBank = globalAptitudeBank && globalAptitudeBank.length > 0 ? globalAptitudeBank : DUMMY_QUESTIONS;
    let targetCount = 10;
    let targetDuration = 15; 
    
    // Look up the company inside the effect
    const company = companies.find(c => c.id === currentSession?.companyId);
    
    if (currentSession && company && company.workflow) {
      const round = company.workflow[currentSession.currentRoundIndex || 0];
      if (round && round.type === 'aptitude') {
        const topics = round.config?.topics || [];
        targetCount = round.config?.questionCount || 10;
        targetDuration = round.duration || 15;
        
        let filtered = sourceBank.filter(q => topics.includes(q.topic));
        sourceBank = filtered.length > 0 ? filtered : sourceBank;
      }
    }

    const shuffled = [...sourceBank].sort(() => 0.5 - Math.random());
    setQuestions(shuffled.slice(0, targetCount));
    setTimeLeft(targetDuration * 60);

  // Used specific primitive dependencies instead of whole objects to prevent re-renders
  }, [currentSession?.companyId, currentSession?.currentRoundIndex, companies, globalAptitudeBank, questions.length]);

  // Timer Logic
  useEffect(() => {
    if (timeLeft > 0 && questions.length > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && questions.length > 0 && !isSubmitting) {
      handleSubmit(); 
    }
  }, [timeLeft, questions.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let correctCount = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.answer) {
          correctCount++;
        }
      });

      const score = Math.round((correctCount / questions.length) * 100);
      const totalDuration = selectedCompany?.workflow?.[currentSession?.currentRoundIndex || 0]?.duration || 15;
      
      const performanceData = {
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        score,
        timeTaken: formatTime((totalDuration * 60) - timeLeft),
        topics: Array.from(new Set(questions.map(q => q.topic)))
      };

      const feedback = await generateRoundFeedback('Aptitude Test', performanceData);
      submitRound(score, feedback);
      
    } catch (error) {
      console.error('Aptitude submission failed:', error);
      alert('Failed to submit test. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading State
  if (questions.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center space-y-4 bg-white rounded-[40px] border border-zinc-200">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        <p className="text-zinc-500 font-medium">Preparing your aptitude questions...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      {/* Header Info */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-900 tracking-tight">Aptitude Evaluation</h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl border-2 transition-colors ${
            timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-600 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-zinc-50 border-zinc-100 text-zinc-900'
          }`}>
            <Timer className={`w-5 h-5 ${timeLeft < 60 ? 'animate-pulse' : ''}`} />
            <span className="text-lg font-mono font-bold tracking-tighter">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden shadow-inner">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-emerald-500"
        />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white p-10 rounded-[40px] border border-zinc-200 shadow-sm space-y-8"
        >
          <div className="space-y-4">
            <span className="px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {currentQuestion.topic}
            </span>
            <h3 className="text-2xl font-bold text-zinc-900 leading-tight">
              {currentQuestion.question}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(currentQuestion.id, option)}
                className={`p-6 rounded-3xl border-2 text-left transition-all flex items-center gap-4 group active:scale-[0.98] ${
                  answers[currentQuestion.id] === option
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-lg shadow-emerald-500/10'
                    : 'border-zinc-100 hover:border-emerald-200 bg-zinc-50/50 text-zinc-600 hover:bg-white'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                  answers[currentQuestion.id] === option
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-400 group-hover:border-emerald-200'
                }`}>
                  {String.fromCharCode(65 + i)}
                </div>
                <span className="font-medium text-sm">{option}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-100 transition-all disabled:opacity-0"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>

        {currentQuestionIndex === questions.length - 1 ? (
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 flex items-center gap-3 disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            Finish & Submit
          </button>
        ) : (
          <button 
            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
            className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 active:scale-95"
          >
            Next Question
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-center gap-8 pt-4">
        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
          <Info className="w-4 h-4 text-zinc-300" />
          Auto-saving answers
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
          <Target className="w-4 h-4 text-emerald-500" />
          Target Cutoff: {selectedCompany?.workflow?.[currentSession?.currentRoundIndex || 0]?.cutoff || 70}%
        </div>
      </div>
    </div>
  );
}