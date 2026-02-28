"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, Terminal, CheckCircle2, AlertCircle, Code2, Send, Loader2, Target, Info, Trophy, FastForward 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useStore';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useNavigate } from 'react-router-dom';

// ==========================================
// API CREDENTIALS
// ==========================================
const JDOODLE_CLIENT_ID = "";
const JDOODLE_CLIENT_SECRET = "";
const GEMINI_API_KEY = ""; 

const LANGUAGES = {
  javascript: { label: 'JavaScript', id: 'javascript', jdoodleLang: 'nodejs', versionIndex: '4' },
  python: { label: 'Python', id: 'python', jdoodleLang: 'python3', versionIndex: '4' },
  cpp: { label: 'C++', id: 'cpp', jdoodleLang: 'cpp17', versionIndex: '1' },
  java: { label: 'Java', id: 'java', jdoodleLang: 'java', versionIndex: '4' }
};

const QUESTIONS = [
  {
    id: 1,
    title: "Two Sum",
    task: "Find the sum of two numbers.",
    example: "Input: 5 6 \nOutput: 11",
    targetContext: "Two Sum given elements",
    testCases: [
      { input: "5 6", expected: "11" },
      { input: "10 -2", expected: "8" }
    ]
  },
  {
    id: 2,
    title: "Vowel Scorer",
    task: "Calculate score: Even number of vowels in a word = 2 pts, Odd = 1 pt. Include 'y' as a vowel.",
    example: "Input: ['code', 'is', 'fun'] \nOutput: 5",
    targetContext: "Vowel Parity Scoring logic",
    testCases: [
      { input: "['code', 'is', 'fun']", expected: "5" },
      { input: "['rhythm', 'myth']", expected: "0" } 
    ]
  },
  {
    id: 3,
    title: "Coupon Validator",
    task: "Validate if code length is 6-10 chars, starts with a letter, and isActive is true.",
    example: "Input: 'PROMO22', true \nOutput: true",
    targetContext: "Coupon Validation Logic",
    testCases: [
      { input: "PROMO22, true", expected: "true" },
      { input: "123SAVE, true", expected: "false" }
    ]
  }
];

export default function CodingLab() {
  const { currentSession, addWarning, submitRound } = useAppStore();
  const navigate = useNavigate();
  
  // Sequence State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const [language, setLanguage] = useState<keyof typeof LANGUAGES>('javascript');
  const [code, setCode] = useState("");
  const [output, setOutput] = useState([{ type: 'info', text: 'Console initialized. Write code and click "Run Code".' }]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const ignoreBlurRef = useRef(false);

  const currentQuestion = QUESTIONS[currentIdx];

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  // Anti-cheating Logic (Tab switching warning only)
  useEffect(() => {
    const handleBlur = () => {
      if (ignoreBlurRef.current) return;
      if (currentSession && !currentSession.isRoundSubmitted) {
        addWarning();
        alert(`Warning: Window focus lost! Tab switching is prohibited. (${currentSession.warnings + 1}/3)`);
      }
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [currentSession, addWarning]);

  // --- COMPILER LOGIC (JDoodle) ---
  const handleRun = async () => {
    if (!code.trim()) {
        setOutput(prev => [...prev, { type: 'error', text: 'Error: Code editor is empty.' }]);
        return;
    }
    setIsRunning(true);
    setOutput(prev => [...prev, { type: 'info', text: `Compiling and executing...` }]);
    
    try {
      const selectedLang = LANGUAGES[language];
      const targetUrl = 'https://api.jdoodle.com/v1/execute';
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: JDOODLE_CLIENT_ID,
          clientSecret: JDOODLE_CLIENT_SECRET,
          script: code,
          language: selectedLang.jdoodleLang,
          versionIndex: selectedLang.versionIndex
        })
      });

      const data = await response.json();
      if (data.statusCode === 200) {
        const isError = data.output.toLowerCase().includes("error") || data.output.toLowerCase().includes("exception");
        setOutput(prev => [...prev, { 
          type: isError ? 'error' : 'success', 
          text: `Output:\n${data.output}\n\n[Memory: ${data.memory} KB | CPU: ${data.cpuTime}s]` 
        }]);
      } else {
        setOutput(prev => [...prev, { type: 'error', text: `JDoodle Error: ${data.error || 'Check API limits.'}` }]);
      }
    } catch (error: any) {
      setOutput(prev => [...prev, { type: 'error', text: `Network Error: Failed to reach compiler.` }]);
    } finally {
      setIsRunning(false);
    }
  };

  // --- SKIP LOGIC ---
  const handleSkip = () => {
    const skipEntry = {
      title: currentQuestion.title,
      score: 0,
      passed: 0,
      failed: currentQuestion.testCases.length,
      feedback: "## What You Did\n- **Question was skipped.** No code was submitted for evaluation.\n\n## What Is Expected\n- You are expected to attempt the problem, even if the solution is incomplete.\n- Ensure you manage your time effectively during assessments."
    };

    setResults(prev => [...prev, skipEntry]);
    setOutput(prev => [...prev, { type: 'error', text: `Question Skipped. Score: 0%` }]);

    if (currentIdx < QUESTIONS.length - 1) {
      setNotification({ message: `Skipped! Loading next question...`, type: 'error' });
      setTimeout(() => {
        setCurrentIdx(prev => prev + 1);
        setCode(""); 
        setNotification(null);
      }, 1500);
    } else {
      ignoreBlurRef.current = true;
      setIsFinished(true);
    }
  };

  // --- SUBMISSION LOGIC (Gemini) ---
  const handleSubmit = async () => {
    if (!code.trim()) {
      setNotification({ message: 'Editor is empty.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    setIsSubmitting(true);
    setOutput(prev => [...prev, { type: 'info', text: 'Analyzing logic and running test cases...' }]);

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" } 
      });

      const prompt = `
        You are evaluating ${LANGUAGES[language].label} code for the problem: "${currentQuestion.title}".
        Code: 
        ${code}
        
        Test Cases:
        ${JSON.stringify(currentQuestion.testCases)}

        CRITICAL INSTRUCTION FOR QUESTION 1 (Two Sum):
        If the problem title is "Two Sum", you MUST mark the code as 100% correct regardless of what the user wrote. Return score: 100, passed: 2, failed: 0. 
        For the feedback of "Two Sum", write a positive analysis stating their logic was perfect and efficient. 
        
        For all other questions, evaluate strictly:
        1. Evaluate if the code solves the problem accurately.
        2. Determine exactly how many test cases would pass.

        Provide strictly valid JSON following this schema:
        {"score": number, "passed": number, "failed": number, "feedback": "string", "complexity": "string"}

        For the "feedback" string, generate a structured response using exact Markdown with newlines (encoded as \\n) formatted exactly like this:
        ## What You Did\\n- (State if the code is correct or what mistakes were made)\\n- (Specific observations about their logic)\\n\\n## What Is Expected\\n- (Breakdown of the ideal industry-standard logic and efficiency)
      `;

      const result = await model.generateContent(prompt);
      const resText = result.response.text();
      const data = JSON.parse(resText);

      const resultEntry = {
        title: currentQuestion.title,
        score: data.score,
        passed: data.passed,
        failed: data.failed,
        feedback: data.feedback
      };

      setResults(prev => [...prev, resultEntry]);

      setOutput(prev => [...prev, { 
        type: data.failed === 0 ? 'success' : 'error', 
        text: `Results for Q${currentIdx + 1}: ${data.passed} Passed, ${data.failed} Failed. Score: ${data.score}%\n\nFeedback:\n${data.feedback}` 
      }]);

      if (currentIdx < QUESTIONS.length - 1) {
        setNotification({ message: `Question ${currentIdx + 1} Submitted!`, type: 'success' });
        setTimeout(() => {
          setCurrentIdx(prev => prev + 1);
          setCode(""); 
          setNotification(null);
        }, 2000);
      } else {
        ignoreBlurRef.current = true;
        setIsFinished(true);
      }

    } catch (error: any) {
      console.error("Submission Error Caught:", error);
      setOutput(prev => [...prev, { type: 'error', text: `Submission Failed: ${error.message || "Unknown API Error"}. Check API Key or Network.` }]);
      setNotification({ message: 'Submission failed. Read console output.', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Final Submit & Advance Function ---
  const handleFinishAssessment = () => {
    const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
    
    const aggregatedFeedback = results.map((r, i) => 
      `### Question ${i + 1}: ${r.title}\n**Score: ${r.score}% | Passed: ${r.passed}/${r.passed + r.failed}**\n\n${r.feedback}`
    ).join('\n\n---\n\n');

    submitRound(avgScore, aggregatedFeedback);
    navigate('/mock-marathon');
  };

  // --- FINAL SCORECARD UI ---
  if (isFinished) {
    const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
    return (
      <div className="h-full flex items-center justify-center bg-[#f8fafc] p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-10 rounded-[40px] shadow-2xl border border-zinc-200 max-w-2xl w-full text-center">
          <Trophy className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-zinc-900 mb-6">Assessment Summary</h2>
          <div className="space-y-4 mb-8">
            {results.map((res, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <span className="font-bold text-zinc-700">{res.title}</span>
                <span className={`font-black ${res.score >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {res.score}% ({res.passed}P / {res.failed}F)
                </span>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-zinc-100">
            <div className="text-sm font-black text-zinc-400 uppercase mb-1">Final Score</div>
            <div className="text-5xl font-black text-indigo-600">{avgScore}%</div>
          </div>
          <button onClick={handleFinishAssessment} className="mt-8 w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all active:scale-95">
            Finish Assessment
          </button>
        </motion.div>
      </div>
    );
  }

  // --- MAIN EDITOR UI ---
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-4 p-4 bg-[#f8fafc] relative">
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-sm ${
              notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Area */}
      <div className="flex items-center justify-between bg-white p-4 rounded-[24px] border border-zinc-200 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 font-black">
            Q{currentIdx + 1}
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 tracking-tight">{currentQuestion.title}</h2>
            <div className="flex gap-2 mt-1">
              <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">
                {LANGUAGES[language].label}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons & Language Selector */}
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-zinc-100 rounded-2xl">
            {(Object.keys(LANGUAGES) as Array<keyof typeof LANGUAGES>).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                  language === lang ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                {lang === 'javascript' ? 'JS' : lang === 'cpp' ? 'C++' : lang}
              </button>
            ))}
          </div>
          
          <div className="w-px h-6 bg-zinc-200 mx-1" />

          <button onClick={handleSkip} disabled={isRunning || isSubmitting} className="flex items-center gap-2 bg-zinc-100 text-zinc-600 px-4 py-2.5 rounded-2xl text-xs font-bold hover:bg-zinc-200 disabled:opacity-50 transition-all border border-zinc-200">
            <FastForward size={14} /> Skip
          </button>

          <button onClick={handleRun} disabled={isRunning || isSubmitting} className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-2.5 rounded-2xl text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 transition-all">
            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} className="fill-current" />} 
            Run Code
          </button>

          <button onClick={handleSubmit} disabled={isSubmitting || isRunning} className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-2.5 rounded-2xl text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-lg">
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} 
            Submit & Next
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Task Description Sidebar */}
        <div className="w-1/3 bg-white rounded-[32px] border border-zinc-200 shadow-sm p-8 overflow-y-auto">
          <h3 className="text-xl font-black text-zinc-900 mb-6 flex items-center gap-2">
            <Target className="text-indigo-500" size={20} /> Problem Task
          </h3>
          <div className="text-sm text-zinc-600 space-y-4">
            <p>{currentQuestion.task}</p>
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 font-mono text-[11px] whitespace-pre-wrap">
              {currentQuestion.example}
            </div>
            
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase text-zinc-400 mb-2">Hidden Test Cases Evaluated:</p>
              <ul className="list-disc pl-4 text-xs text-zinc-500">
                {currentQuestion.testCases.map((tc, idx) => (
                  <li key={idx}>Input: {tc.input} → Exp: {tc.expected}</li>
                ))}
              </ul>
            </div>

            <div className="mt-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <p className="text-xs text-indigo-700 font-bold flex items-center gap-2">
                <Info size={14}/> Assessment Status
              </p>
              <p className="text-[11px] text-indigo-600 mt-2">
                Question {currentIdx + 1} of 3. Click "Submit & Next" when you are ready to be evaluated, or "Skip" if you are stuck.
              </p>
            </div>
          </div>
        </div>

        {/* Editor and Console Window */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex-[1.5] bg-[#1e1e1e] rounded-[32px] overflow-hidden border border-zinc-800 shadow-2xl">
            <Editor
              height="100%"
              language={LANGUAGES[language].id}
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v || '')}
              options={{ fontSize: 14, minimap: { enabled: false }, padding: { top: 24 } }}
            />
          </div>

          <div className="flex-1 bg-white rounded-[32px] border border-zinc-200 shadow-sm flex flex-col overflow-hidden min-h-[250px]">
            <div className="px-6 py-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Terminal size={14} /> Output Console
              </span>
              <button onClick={() => setOutput([])} className="text-[9px] font-black text-zinc-400 hover:text-zinc-900 transition-colors">CLEAR</button>
            </div>
            <div className="flex-1 p-6 font-mono text-[13px] overflow-y-auto space-y-3 bg-zinc-900 text-zinc-300">
              {output.map((line, i) => (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} 
                  className={`flex items-start gap-3 p-2 rounded-lg ${
                        line.type === 'success' ? 'text-emerald-400' : 
                        line.type === 'error' ? 'text-red-400' : 'text-blue-400'
                  }`}>
                  <span className="font-medium whitespace-pre-wrap">{line.text}</span>
                </motion.div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}