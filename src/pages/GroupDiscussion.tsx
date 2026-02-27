"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, Send, Loader2, Target, CheckCircle2, 
  AlertTriangle, ChevronRight, User, BrainCircuit,
  Mic, MicOff, Volume2, Info, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useStore';
import { useCmsStore } from '../store/useCmsStore';
import { useNavigate } from 'react-router-dom';

// ==========================================
// 1. API CONFIGURATION (GROQ)
// ==========================================
const GROQ_API_KEY = ""; 
const GROQ_MODEL = "llama-3.1-8b-instant"; 

type Message = { role: 'user' | 'ai', text: string };

export default function GroupDiscussion() {
  const { currentSession, submitRound } = useAppStore();
  const { companies } = useCmsStore();
  const navigate = useNavigate();

  // Dynamically pull the debate topic from the CMS, or use a default
  const currentCompany = companies.find(c => c.id === currentSession?.companyId);
  const currentRound = currentCompany?.workflow[currentSession?.currentRoundIndex || 0];
  const debateTopic = currentRound?.config?.topic || "Cloud Computing is more of a security risk than on-premise infrastructure.";

  // Chat State
  const [messages, setMessages] = useState<Message[]>([{
    role: 'ai',
    text: `Welcome to the Group Discussion round. The topic is: '${debateTopic}'. Make your opening statement.`
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Evaluation State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<{ score: string, feedback: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // ==========================================
  // 2. VOICE INTEGRATION (STT & TTS)
  // ==========================================
  
  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN'; // Optimized for Indian accent

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  // Speech Synthesis (Text-to-Voice)
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1;
      // You can filter voices here if you want a specific one
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  // ==========================================
  // 3. CORE AI FETCH FUNCTION (GROQ)
  // ==========================================
  const callGroq = async (systemPrompt: string, userMessage: string, chatHistory: Message[] = []) => {
    if (!GROQ_API_KEY) throw new Error("API Key Missing");

    const formattedHistory = chatHistory.map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.text
    }));

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...formattedHistory,
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) throw new Error("Groq API Error");
    const data = await response.json();
    return data.choices[0].message.content.trim();
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const systemPrompt = `
        You are an intellectual adversary in a professional corporate Group Discussion regarding: "${debateTopic}".
        RULES:
        1. Never completely agree. Stress-test the candidate's logic.
        2. Keep your response under 3 sentences. Be sharp, professional, and slightly challenging.
        3. Do NOT output any formatting, asterisks, or labels. Just your direct verbal response.
      `;

      const aiResponse = await callGroq(systemPrompt, userMsg, messages);
      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
      speak(aiResponse); // Automatically read the challenge aloud

    } catch (error: any) {
      console.error(error);
      alert("Failed to connect to AI.");
      setMessages(prev => prev.slice(0, -1));
      setInput(userMsg); 
    } finally {
      setIsTyping(false);
    }
  };

  const handleEvaluate = async () => {
    if (messages.length < 4) {
      alert("Please engage in at least 2 back-and-forth exchanges before ending.");
      return;
    }
    
    setIsEvaluating(true);
    try {
      const fullTranscript = messages.map(m => `${m.role === 'ai' ? 'PEER' : 'CANDIDATE'}: ${m.text}`).join('\n\n');

      const judgePrompt = `
        You are a Senior Recruitment Lead. Evaluate the CANDIDATE's performance in the debate.
        Topic: "${debateTopic}"
        FORMAT: <score>0-100</score><feedback>Short paragraph</feedback>
      `;

      const aiResponse = await callGroq(judgePrompt, `Transcript:\n${fullTranscript}`);
      const scoreMatch = aiResponse.match(/<score>([\s\S]*?)<\/score>/i);
      const feedbackMatch = aiResponse.match(/<feedback>([\s\S]*?)<\/feedback>/i);

      setEvaluation({ 
        score: scoreMatch ? scoreMatch[1].trim() : "50", 
        feedback: feedbackMatch ? feedbackMatch[1].trim() : aiResponse 
      });

    } catch (error) {
      alert("Evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCompleteRound = () => {
    if (evaluation) {
      submitRound(parseInt(evaluation.score), evaluation.feedback);
      navigate('/mock-marathon'); 
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-4 p-4 bg-[#f8fafc]">
      
      {/* Header Section */}
      <div className="flex items-center justify-between bg-white p-5 rounded-[28px] border border-zinc-200 shadow-sm shrink-0">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 relative">
            <MessageSquare size={28} />
            <motion.div 
              animate={{ scale: isListening ? [1, 1.2, 1] : 1 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${isListening ? 'bg-red-500' : 'bg-emerald-500'}`}
            />
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-900 tracking-tight leading-none">Group Discussion</h2>
            <div className="flex items-center gap-2 mt-2">
               <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest bg-orange-50 px-2 py-0.5 rounded-md"></span>
               <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md"></span>
            </div>
          </div>
        </div>
        
        {!evaluation && (
          <button 
            onClick={handleEvaluate}
            disabled={isEvaluating || isTyping}
            className="bg-zinc-900 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center gap-3 active:scale-95 shadow-xl shadow-zinc-900/10"
          >
            {isEvaluating ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
            End GD
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          
          {/* ACTIVE CHAT VIEW */}
          {!evaluation ? (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full flex flex-col bg-white rounded-[40px] border border-zinc-200 shadow-sm overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                {messages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
                      msg.role === 'user' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white text-zinc-600 border-zinc-100'
                    }`}>
                      {msg.role === 'user' ? <User size={18} /> : <BrainCircuit size={18} />}
                    </div>
                    <div className={`p-5 rounded-[24px] text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-emerald-600 text-white rounded-tr-sm' 
                        : 'bg-zinc-50 border border-zinc-100 text-zinc-800 rounded-tl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                
                {isTyping && (
                  <div className="flex gap-4 max-w-[80%]">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-50 text-zinc-400 flex items-center justify-center shrink-0 border border-zinc-100">
                      <BrainCircuit size={18} />
                    </div>
                    <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-[24px] rounded-tl-sm flex items-center gap-2">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-zinc-300 rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-zinc-300 rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-zinc-300 rounded-full" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT AREA WITH VOICE BUTTON */}
              <div className="p-6 bg-white border-t border-zinc-100">
                <form onSubmit={handleSend} className="flex gap-4 max-w-5xl mx-auto relative items-center">
                  
                  {/* Voice Control Button */}
                  <button 
                    type="button" 
                    onClick={toggleListening}
                    className={`p-5 rounded-2xl border-2 transition-all flex-shrink-0 ${
                      isListening 
                        ? 'bg-red-50 border-red-200 text-red-500 animate-pulse shadow-lg shadow-red-500/10' 
                        : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:text-emerald-500 hover:border-emerald-200'
                    }`}
                  >
                    {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>

                  <div className="relative flex-1 group">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isTyping}
                      placeholder={isListening ? "Listening to your argument..." : "Counter their point or use the mic..."}
                      className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[24px] px-8 py-5 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-medium pr-20 text-zinc-700"
                    />
                    <button 
                      type="submit" 
                      disabled={!input.trim() || isTyping}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </form>
                
                <div className="flex justify-center mt-4 gap-6">
                   <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                     <Volume2 size={12} className="text-emerald-500" /> AI will reply via voice
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                     <Info size={12} /> Indian English (en-IN) active
                   </div>
                </div>
              </div>
            </motion.div>
          ) : (

            /* EVALUATION VIEW */
            <motion.div 
              key="evaluation"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full bg-white rounded-[40px] border border-zinc-200 shadow-sm p-12 overflow-y-auto flex flex-col items-center text-center"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center border-4 border-emerald-100 mb-8"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </motion.div>
              
              <h3 className="text-4xl font-black text-zinc-900 tracking-tight mb-2">Group Discussion Evaluation</h3>
              <p className="text-zinc-500 font-medium text-lg mb-10">Peer group discussion performance analyzed by AI Recruiter.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                <div className="bg-zinc-50 p-10 rounded-[40px] border border-zinc-100 flex flex-col items-center justify-center">
                  <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Logic Score</p>
                  <div className="relative">
                    <span className="text-7xl font-black text-emerald-500">{evaluation.score}</span>
                    <span className="text-2xl text-zinc-300 font-bold ml-1">/100</span>
                  </div>
                </div>

                <div className="bg-white p-10 rounded-[40px] border border-zinc-200 shadow-sm text-left relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5">
                    <Sparkles size={80} />
                  </div>
                  <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <AlertTriangle className="w-4 h-4 text-orange-500" /> Recruiter Insights
                  </h4>
                  <p className="text-zinc-600 leading-relaxed text-sm whitespace-pre-wrap italic">"{evaluation.feedback}"</p>
                </div>
              </div>

              <button 
                onClick={handleCompleteRound}
                className="mt-12 bg-zinc-900 text-white px-12 py-5 rounded-[24px] font-black uppercase tracking-[0.1em] text-sm hover:bg-zinc-800 transition-all shadow-2xl active:scale-95 flex items-center gap-3"
              >
                Proceed to Next Stage <ChevronRight size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}