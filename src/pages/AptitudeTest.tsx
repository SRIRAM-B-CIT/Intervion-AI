import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Timer,
  Target,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCmsStore, AptitudeQuestion } from '../store/useCmsStore';
import { useAppStore } from '../store/useStore';
import { generateRoundFeedback } from '../services/geminiService';

export default function AptitudeTest() {
  const { globalAptitudeBank, companies } = useCmsStore();
  const { currentSession, submitRound } = useAppStore();
  const [questions, setQuestions] = useState<AptitudeQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCompany = companies.find(c => c.id === currentSession?.companyId);

  useEffect(() => {
    if (currentSession && selectedCompany) {
      const round = selectedCompany.workflow[currentSession.currentRoundIndex];
      if (round && round.type === 'aptitude') {
        const topics = round.config?.topics || [];
        const count = round.config?.questionCount || 10;
        
        // Filter questions by selected topics
        let filtered = globalAptitudeBank.filter(q => topics.includes(q.topic));
        
        // If no topics selected or no questions found, use general bank
        if (filtered.length === 0) {
          filtered = globalAptitudeBank;
        }

        // Shuffle and pick
        const shuffled = [...filtered].sort(() => 0.5 - Math.random());
        setQuestions(shuffled.slice(0, count));
        setTimeLeft(round.duration * 60);
      }
    }
  }, [currentSession, globalAptitudeBank, selectedCompany]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && questions.length > 0) {
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
    if (isSubmitting || !selectedCompany) return;
    setIsSubmitting(true);

    try {
      let correctCount = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.answer) {
          correctCount++;
        }
      });

      const score = Math.round((correctCount / questions.length) * 100);
      
      const performanceData = {
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        score,
        timeTaken: formatTime((selectedCompany.workflow[currentSession!.currentRoundIndex].duration || 0) * 60 - timeLeft),
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Aptitude Round</h2>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-colors ${
            timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-zinc-50 border-zinc-100 text-zinc-900'
          }`}>
            <Timer className={`w-5 h-5 ${timeLeft < 60 ? 'animate-pulse' : ''}`} />
            <span className="text-lg font-mono font-bold">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
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
                className={`p-6 rounded-3xl border-2 text-left transition-all flex items-center gap-4 group ${
                  answers[currentQuestion.id] === option
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : 'border-zinc-100 hover:border-zinc-200 bg-zinc-50/50 text-zinc-600'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                  answers[currentQuestion.id] === option
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-400 group-hover:border-emerald-200'
                }`}>
                  {String.fromCharCode(65 + i)}
                </div>
                <span className="font-medium">{option}</span>
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
            className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            Finish & Submit Test
          </button>
        ) : (
          <button 
            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
            className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2"
          >
            Next Question
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Info Footer */}
          <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4" />
          Answers are saved automatically
        </div>
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" />
          Cutoff: {selectedCompany?.workflow[currentSession!.currentRoundIndex].cutoff}%
        </div>
      </div>
    </div>
  );
}
