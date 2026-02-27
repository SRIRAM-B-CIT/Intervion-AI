"use client";

import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  ChevronRight,
  Target,
  BarChart3,
  Loader2,
  RefreshCcw,
  ListChecks,
  Sparkles,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeResume, generateRoundFeedback } from '../services/geminiService';
import { useAppStore, ResumeAnalysis } from '../store/useStore';

export default function ResumeAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { resumeAnalysis, setResumeAnalysis, currentSession, submitRound } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF, DOCX, or Image (JPG/PNG).');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const base64 = await fileToBase64(file);
      const analysis = await analyzeResume(base64, file.type);
      setResumeAnalysis(analysis);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to analyze resume. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleReset = () => {
    setResumeAnalysis(null as any);
    setError(null);
  };

  const handleSubmitAnalysis = async () => {
    if (!resumeAnalysis) return;
    setIsSubmitting(true);
    try {
      const feedback = await generateRoundFeedback('Resume Analysis', resumeAnalysis);
      submitRound(resumeAnalysis.atsScore, feedback);
    } catch (err) {
      console.error(err);
      alert('Failed to submit analysis. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">AI Resume Intelligence</h1>
        <p className="text-zinc-500 max-w-2xl mx-auto">
          Our advanced Resume AI engine analyzes your resume against industry standards and ATS algorithms.
        </p>
      </div>

      {!resumeAnalysis && !isAnalyzing ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-16 rounded-[40px] border-2 border-dashed border-zinc-200 text-center space-y-8 shadow-sm hover:border-emerald-500/50 transition-colors group"
        >
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
            <Upload className="w-12 h-12 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-zinc-900">Upload your professional resume</h3>
            <p className="text-zinc-500 max-w-sm mx-auto">
              Supports PDF, DOCX, and Images. Your data is processed securely by our Resume AI.
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.docx,.jpg,.jpeg,.png"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Select Resume File
            </button>
            {error && (
              <p className="text-red-500 text-sm font-medium flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        </motion.div>
      ) : isAnalyzing ? (
        <div className="bg-white p-16 rounded-[40px] border border-zinc-200 text-center space-y-8 shadow-sm">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-100" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-emerald-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-zinc-900">Analyzing Resume...</h3>
            <p className="text-zinc-500">Extracting semantic meaning and calculating ATS compatibility.</p>
          </div>
          <div className="max-w-md mx-auto h-2 bg-zinc-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 15 }}
              className="h-full bg-emerald-500"
            />
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          {/* Left Column: Scores & Summary */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-zinc-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Zap className="w-40 h-40" />
              </div>
              <h3 className="text-xl font-bold mb-8">ATS Compatibility</h3>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="12"
                    />
                    <motion.circle
                      cx="96"
                      cy="96"
                      r="88"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="12"
                      strokeDasharray={552.92}
                      initial={{ strokeDashoffset: 552.92 }}
                      animate={{ strokeDashoffset: 552.92 * (1 - resumeAnalysis!.atsScore / 100) }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold">{resumeAnalysis!.atsScore}</span>
                    <span className="text-zinc-400 text-sm font-medium">Out of 100</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">Formatting</p>
                  <p className="text-xl font-bold text-emerald-400">{resumeAnalysis!.formattingScore}%</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">Keywords</p>
                  <p className="text-xl font-bold text-blue-400">{resumeAnalysis!.topSkills.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-zinc-200 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-zinc-400" />
                Professional Summary
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed italic">
                "{resumeAnalysis!.summary}"
              </p>
            </div>
          </div>

          {/* Right Column: Detailed Feedback */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[40px] border border-zinc-200 shadow-sm">
                <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Top Identified Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {resumeAnalysis!.topSkills.map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[40px] border border-zinc-200 shadow-sm">
                <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  Missing Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {resumeAnalysis!.missingKeywords.map((keyword, i) => (
                    <span key={i} className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-xl text-xs font-bold border border-orange-100">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-zinc-200 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-blue-500" />
                Recommended Action Items
              </h3>
              <div className="space-y-3">
                {resumeAnalysis!.actionItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 group hover:border-blue-200 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-500 group-hover:border-blue-500 transition-all">
                      <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white">{i + 1}</span>
                    </div>
                    <p className="text-sm text-zinc-700 font-medium">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              {currentSession ? (
                <button 
                  onClick={handleSubmitAnalysis}
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Submit Analysis & Continue
                </button>
              ) : (
                <button 
                  onClick={handleReset}
                  className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-5 h-5" />
                  Analyze New Resume
                </button>
              )}
              <button className="px-8 py-4 bg-white border border-zinc-200 rounded-2xl font-bold text-zinc-600 hover:bg-zinc-50 transition-all">
                Download Report
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}