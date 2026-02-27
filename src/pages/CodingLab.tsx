import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, 
  RotateCcw, 
  Settings, 
  ChevronRight, 
  Terminal,
  CheckCircle2,
  AlertCircle,
  Code2,
  Send,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore } from '../store/useStore';
import { generateRoundFeedback } from '../services/geminiService';

export default function CodingLab() {
  const { currentSession, addWarning, submitRound } = useAppStore();
  const [code, setCode] = useState(`function findTwoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`);

  const [output, setOutput] = useState([
    { type: 'info', text: 'Ready to run your code...' }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Anti-cheating: Focus Tracking
  useEffect(() => {
    const handleBlur = () => {
      if (currentSession && !currentSession.isRoundSubmitted) {
        addWarning();
        alert(`Warning: Window focus lost! Switching tabs or leaving the window is not allowed. (${currentSession.warnings + 1}/3)`);
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [currentSession, addWarning]);

  // Anti-cheating: Event Interception
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
      e.preventDefault();
      alert('Copy, Paste, and Cut are disabled for security reasons.');
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    alert('Right-click is disabled for security reasons.');
  }, []);

  const handleRun = () => {
    setIsRunning(true);
    setOutput(prev => [...prev, { type: 'info', text: 'Compiling and executing...' }]);
    
    setTimeout(() => {
      setOutput(prev => [
        ...prev, 
        { type: 'success', text: 'Test Case 1: Passed (2ms)' },
        { type: 'success', text: 'Test Case 2: Passed (1ms)' },
        { type: 'error', text: 'Test Case 3: Failed (Expected [0,1], got [])' }
      ]);
      setIsRunning(false);
    }, 1500);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const performanceData = {
        code,
        testResults: output.filter(o => o.type !== 'info'),
        warnings: currentSession?.warnings || 0
      };
      
      const feedback = await generateRoundFeedback('Coding', performanceData);
      // Mock score calculation based on test results
      const passCount = output.filter(o => o.type === 'success').length;
      const totalTests = output.filter(o => o.type !== 'info').length || 1;
      const score = Math.round((passCount / totalTests) * 100);
      
      submitRound(score, feedback);
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="h-[calc(100vh-240px)] flex flex-col gap-4"
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-zinc-900">Two Sum Problem</h2>
            <p className="text-xs text-zinc-500">Difficulty: Easy • Time Limit: 2.0s</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRun}
            disabled={isRunning || isSubmitting}
            className="bg-zinc-100 text-zinc-700 px-6 py-2 rounded-xl font-bold hover:bg-zinc-200 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            Run Code
          </button>
          <div className="w-px h-6 bg-zinc-200 mx-2" />
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Solution
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Problem Description */}
        <div className="w-1/3 bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 overflow-y-auto">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Description</h3>
          <div className="prose prose-zinc prose-sm">
            <p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.</p>
            <p>You may assume that each input would have exactly one solution, and you may not use the same element twice.</p>
            <p>You can return the answer in any order.</p>
            
            <h4 className="text-sm font-bold mt-6 mb-2">Example 1:</h4>
            <pre className="bg-zinc-50 p-3 rounded-xl text-xs">
              Input: nums = [2,7,11,15], target = 9{"\n"}
              Output: [0,1]{"\n"}
              Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
            </pre>

            <h4 className="text-sm font-bold mt-6 mb-2">Constraints:</h4>
            <ul className="list-disc pl-4 space-y-1 text-zinc-600">
              <li>2 ≤ nums.length ≤ 10⁴</li>
              <li>-10⁹ ≤ nums[i] ≤ 10⁹</li>
              <li>-10⁹ ≤ target ≤ 10⁹</li>
            </ul>
          </div>
        </div>

        {/* Editor & Console */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex-1 bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v || '')}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 20 },
                fontFamily: 'JetBrains Mono',
                contextmenu: false, // Disable built-in context menu
              }}
            />
          </div>

          {/* Console */}
          <div className="h-48 bg-white rounded-3xl border border-zinc-200 shadow-sm flex flex-col overflow-hidden">
            <div className="px-6 py-3 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Console Output</span>
              </div>
              <button 
                onClick={() => setOutput([{ type: 'info', text: 'Console cleared.' }])}
                className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-tighter"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 p-4 font-mono text-sm overflow-y-auto space-y-1">
              {output.map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  {line.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />}
                  {line.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                  <span className={
                    line.type === 'success' ? 'text-emerald-600' :
                    line.type === 'error' ? 'text-red-600' :
                    'text-zinc-500'
                  }>
                    {line.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
