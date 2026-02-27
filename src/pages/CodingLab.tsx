"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, Terminal, CheckCircle2, AlertCircle, Code2, Send, Loader2, Target, Info 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useStore';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useNavigate } from 'react-router-dom';

// ==========================================
// PASTE YOUR JDOODLE CREDENTIALS HERE:
// ==========================================
const JDOODLE_CLIENT_ID ="8bdf7b3ebbd45a90fa5113276a2b673c";
const JDOODLE_CLIENT_SECRET ="f209b4f9323b4efbf328daf44b20216f870ee8563593736f1755f84e8b67b605";

// Updated to use JDoodle Language Codes and Version Indexes
const LANGUAGES = {
  javascript: { label: 'JavaScript', id: 'javascript', jdoodleLang: 'nodejs', versionIndex: '4' }, // Node.js 17
  python: { label: 'Python', id: 'python', jdoodleLang: 'python3', versionIndex: '4' },        // Python 3.9
  cpp: { label: 'C++', id: 'cpp', jdoodleLang: 'cpp17', versionIndex: '1' },                   // GCC 11
  java: { label: 'Java', id: 'java', jdoodleLang: 'java', versionIndex: '4' }                  // JDK 17
};

export default function CodingLab() {
  const { currentSession, addWarning, submitRound } = useAppStore();
  const navigate = useNavigate();
  
  const [language, setLanguage] = useState<keyof typeof LANGUAGES>('javascript');
  const [code, setCode] = useState("");
  const [output, setOutput] = useState([{ type: 'info', text: 'Console initialized. Write code and click "Run Code".' }]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const ignoreBlurRef = useRef(false);

  // Gemini API Key for Submission/Evaluation
  const genAI = new GoogleGenerativeAI("AIzaSyAeQxJj3qpytra3MnPvO1LNjZ6qx3C7Clk");

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  // Anti-cheating Logic
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
      e.preventDefault();
      setNotification({ message: 'Copy/Paste/Cut is disabled for this assessment.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  // --- REAL COMPILER EXECUTION (Using JDoodle API) ---
  const handleRun = async () => {
    if (!code.trim()) {
        setOutput(prev => [...prev, { type: 'error', text: 'Error: Code editor is empty.' }]);
        return;
    }

    if (JDOODLE_CLIENT_ID === "8bdf7b3ebbd45a90fa5113276a2b673c") {
        setOutput(prev => [...prev, { type: 'error', text: 'Developer Error: Please add your JDoodle Client ID and Secret to the code.' }]);
        return;
    }

    setIsRunning(true);
    setOutput(prev => [...prev, { type: 'info', text: `Compiling and executing ${LANGUAGES[language].label} code...` }]);
    
    try {
      const selectedLang = LANGUAGES[language];
      
      // We use corsproxy.io to bypass browser CORS restrictions for the JDoodle API
      const proxyUrl = 'https://corsproxy.io/?';
      const targetUrl = 'https://api.jdoodle.com/v1/execute';

      const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: JDOODLE_CLIENT_ID,
          clientSecret: JDOODLE_CLIENT_SECRET,
          script: code,
          language: selectedLang.jdoodleLang,
          versionIndex: selectedLang.versionIndex
        })
      });

      if (!response.ok) {
        throw new Error(`Compiler API returned status: ${response.status}`);
      }

      const data = await response.json();

      // JDoodle returns 200 statusCode inside the JSON body on success
      if (data.statusCode === 200) {
        // JDoodle combines stdout and stderr into the "output" field
        const isError = data.output.toLowerCase().includes("error") || data.output.toLowerCase().includes("exception");
        
        setOutput(prev => [...prev, { 
          type: isError ? 'error' : 'success', 
          text: `Output:\n${data.output}\n\n[Memory: ${data.memory} KB | CPU: ${data.cpuTime}s]` 
        }]);
      } else {
        // API Level Error (e.g. Invalid tokens, daily limit reached)
        setOutput(prev => [...prev, { type: 'error', text: `JDoodle Error: ${data.error || 'Daily limit reached or invalid credentials.'}` }]);
      }

    } catch (error: any) {
      console.error("Execution Error:", error);
      setOutput(prev => [...prev, { type: 'error', text: `Execution Server Error: Failed to connect to proxy or compiler.` }]);
    } finally {
      setIsRunning(false);
    }
  };

  // --- AI JUDGE FOR SUBMISSION ---
  const handleSubmit = async () => {
    if (!code.trim()) {
      setNotification({ message: 'Editor is empty. Please write some code before submitting.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    setIsSubmitting(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `
        You are a strict technical interviewer. Evaluate this ${LANGUAGES[language].label} code for the "Two Sum" problem.
        User Code: 
        ${code}

        Return ONLY a raw JSON object with NO markdown formatting, containing these exact keys:
        {
          "score": number (0-100, judge correctness, edge cases, and efficiency),
          "feedback": "string explaining what is right or wrong logically",
          "complexity": "string analyzing time/space complexity (e.g. O(n^2) vs O(n))"
        }
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      
      let formattedFeedback = "";
      let finalScore = 0;

      try {
        const parsedData = JSON.parse(cleanJson);
        formattedFeedback = `${parsedData.feedback}\n\nComplexity Analysis: ${parsedData.complexity}`;
        finalScore = parsedData.score;
      } catch (parseError) {
        formattedFeedback = responseText; 
        finalScore = 50; 
      }
      
      submitRound(finalScore, formattedFeedback); 
      
      ignoreBlurRef.current = true;
      setNotification({ message: `AI Evaluation Complete! Score: ${finalScore}%. Proceeding...`, type: 'success' });
      
      setTimeout(() => {
        navigate('/mock-marathon');
      }, 1500);

    } catch (error) {
      console.error('AI Processing Failed:', error);
      setNotification({ message: 'AI analysis service is temporarily unavailable. Please try again.', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="h-[calc(100vh-140px)] flex flex-col gap-4 p-4 bg-[#f8fafc] relative"
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => { 
        e.preventDefault(); 
        setNotification({ message: 'Right-click is disabled.', type: 'error' });
        setTimeout(() => setNotification(null), 3000);
      }}
    >
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-sm ${
              notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between bg-white p-4 rounded-[24px] border border-zinc-200 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
            <Code2 size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 tracking-tight">Two Sum Problem</h2>
            <div className="flex gap-2 mt-1">
              <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">
                {LANGUAGES[language].label}
              </span>
            </div>
          </div>
        </div>

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

          <button 
            onClick={handleRun} 
            disabled={isRunning || isSubmitting} 
            className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-2.5 rounded-2xl text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 transition-all active:scale-95"
          >
            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} className="fill-current" />} 
            Run Code
          </button>

          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting || isRunning} 
            className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-2.5 rounded-2xl text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} 
            Submit & Proceed
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-1/3 bg-white rounded-[32px] border border-zinc-200 shadow-sm p-8 overflow-y-auto">
          <h3 className="text-xl font-black text-zinc-900 mb-6 flex items-center gap-2">
            <Target className="text-indigo-500" size={20} /> Problem Task
          </h3>
          <div className="text-sm text-zinc-600 space-y-4">
            <p>Find indices of two numbers that sum to target.</p>
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 font-mono text-[11px]">
              Input: [2, 7, 11, 15], Target: 9 <br/>
              Output: [0, 1]
            </div>
            
            <div className="mt-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <p className="text-xs text-indigo-700 font-bold flex items-center gap-2">
                <Info size={14}/> Test Your Code
              </p>
              <p className="text-[11px] text-indigo-600 mt-2">
                Use <code className="bg-white px-1 rounded">console.log()</code> or <code className="bg-white px-1 rounded">print()</code> in your code to see the output in the console below when you click "Run Code".
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex-[1.5] bg-[#1e1e1e] rounded-[32px] overflow-hidden border border-zinc-800 shadow-2xl">
            <Editor
              height="100%"
              language={LANGUAGES[language].id}
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v || '')}
              options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 24 } }}
            />
          </div>

          <div className="flex-1 bg-white rounded-[32px] border border-zinc-200 shadow-sm flex flex-col overflow-hidden min-h-[250px]">
            <div className="px-6 py-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Terminal size={14} /> Output Console
              </span>
              <button onClick={() => setOutput([])} className="text-[9px] font-black text-zinc-400 hover:text-zinc-900">CLEAR</button>
            </div>
            
            <div className="flex-1 p-6 font-mono text-[13px] overflow-y-auto space-y-3 bg-zinc-900 text-zinc-300">
              {output.map((line, i) => (
                <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    key={i} 
                    className={`flex items-start gap-3 p-2 rounded-lg ${
                        line.type === 'success' ? 'text-emerald-400' : 
                        line.type === 'error' ? 'text-red-400' : 'text-blue-400'
                    }`}
                >
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