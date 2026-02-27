"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, Terminal, CheckCircle2, AlertCircle, Code2, Send, Loader2, Target 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useStore';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useNavigate } from 'react-router-dom';

const LANGUAGES = {
  javascript: { label: 'JavaScript', id: 'javascript' },
  python: { label: 'Python', id: 'python' },
  cpp: { label: 'C++', id: 'cpp' },
  java: { label: 'Java', id: 'java' }
};

export default function CodingLab() {
  const { currentSession, addWarning, submitRound } = useAppStore();
  const navigate = useNavigate();
  
  const [language, setLanguage] = useState<keyof typeof LANGUAGES>('javascript');
  const [code, setCode] = useState("");
  const [output, setOutput] = useState([{ type: 'info', text: 'Console initialized. Write code and click "Run Code".' }]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  
  // FIX 1: Provide 'null' as the initial value to fix the TypeScript error
  const blurHandlerRef = useRef<(() => void) | null>(null);

  const genAI = new GoogleGenerativeAI("AIzaSyBnISk1eDOuDPGJmNn9QYwx3SwVMBdv3y8");

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  // Anti-cheating & Proctored Logic
  useEffect(() => {
    const handleBlur = () => {
      if (currentSession && !currentSession.isRoundSubmitted) {
        addWarning();
        alert(`Warning: Window focus lost! Tab switching is prohibited. (${currentSession.warnings + 1}/3)`);
      }
    };
    
    blurHandlerRef.current = handleBlur;
    window.addEventListener('blur', handleBlur);
    
    return () => window.removeEventListener('blur', handleBlur);
  }, [currentSession, addWarning]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
      e.preventDefault();
      alert('Copy/Paste/Cut is disabled for this assessment.');
    }
  }, []);

  const handleRun = async () => {
    if (!code.trim()) {
        setOutput(prev => [...prev, { type: 'error', text: 'Error: Code editor is empty.' }]);
        return;
    }

    setIsRunning(true);
    setOutput(prev => [...prev, { type: 'info', text: `AI Judge: Compiling and running ${LANGUAGES[language].label}...` }]);
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `
        Act as a code execution engine and test judge.
        Problem: Two Sum (Find indices of two numbers that add up to target).
        Language: ${LANGUAGES[language].label}
        Code: ${code}

        Test Case 1: nums = [2,7,11,15], target = 9 (Expected: [0,1])
        Test Case 2: nums = [3,2,4], target = 6 (Expected: [1,2])

        Analyze if the code is syntactically correct and passes both cases.
        Return ONLY a JSON array like this:
        [
          {"case": 1, "passed": true/false, "output": "actual_output", "error": "compiler_error_if_any"},
          {"case": 2, "passed": true/false, "output": "actual_output", "error": ""}
        ]
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      const results = JSON.parse(cleanJson);

      const newOutputs = results.map((res: any) => ({
        type: res.passed ? 'success' : 'error',
        text: `Test Case ${res.case}: ${res.passed ? 'Passed ✅' : 'Failed ❌'} (Result: ${res.output}) ${res.error ? ' - ' + res.error : ''}`
      }));

      setOutput(prev => [...prev, ...newOutputs]);
    } catch (error) {
      setOutput(prev => [...prev, { type: 'error', text: 'AI Judge Error: Failed to evaluate code.' }]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) return alert("Editor is empty. Please write some code before submitting.");
    
    setIsSubmitting(true);
    
    if (blurHandlerRef.current) {
        window.removeEventListener('blur', blurHandlerRef.current);
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
        Evaluate this ${LANGUAGES[language].label} code for the "Two Sum" problem.
        User Code: ${code}
        Warnings Issued: ${currentSession?.warnings || 0}
        
        Return ONLY a raw JSON object with NO markdown formatting, containing these exact keys:
        {
          "score": number (0-100),
          "feedback": "string explaining what is right or wrong",
          "complexity": "string analyzing time/space complexity"
        }
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Clean up markdown block if Gemini adds it
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      
      let formattedFeedback = "";
      let aiScore = 0;

      // FIX 2: Parse the JSON and format it into clean text
      try {
        const parsedData = JSON.parse(cleanJson);
        formattedFeedback = `${parsedData.feedback}\n\nComplexity Analysis: ${parsedData.complexity}`;
        aiScore = parsedData.score;
      } catch (parseError) {
        console.error("Failed to parse JSON from AI", responseText);
        // Fallback if Gemini doesn't format it right
        formattedFeedback = responseText; 
        aiScore = 50; 
      }
      
      // Factor in passing test cases from the console output
      const passedTests = output.filter(o => o.text.includes('Passed ✅')).length;
      
      // If code failed tests, penalize the AI's score
      const finalScore = passedTests === 2 ? aiScore : (passedTests === 1 ? Math.min(aiScore, 50) : 0);

      submitRound(finalScore, formattedFeedback); 
      
      alert(`AI Evaluation Complete! Score: ${finalScore}%. Proceeding to the next round...`);
      navigate('/mock-marathon');

    } catch (error) {
      console.error('AI Processing Failed:', error);
      alert('AI analysis service is temporarily unavailable. Please try submitting again.');
      
      if (blurHandlerRef.current) {
          window.addEventListener('blur', blurHandlerRef.current);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="h-[calc(100vh-140px)] flex flex-col gap-4 p-4 bg-[#f8fafc]"
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => { e.preventDefault(); alert('Right-click disabled.'); }}
    >
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
                onClick={() => setLanguage(lang)}
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
            
            <div className="flex-1 p-6 font-mono text-[13px] overflow-y-auto space-y-3 bg-white">
              {output.map((line, i) => (
                <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    key={i} 
                    className={`flex items-start gap-3 p-2 rounded-lg ${
                        line.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 
                        line.type === 'error' ? 'bg-red-50 text-red-700' : 'text-zinc-500'
                    }`}
                >
                  {line.type === 'success' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : 
                   line.type === 'error' ? <AlertCircle size={16} className="shrink-0 mt-0.5" /> : null}
                  <span className="font-bold">{line.text}</span>
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