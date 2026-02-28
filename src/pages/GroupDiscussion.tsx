"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, Send, Loader2, Target, CheckCircle2, 
  AlertTriangle, ChevronRight, User, BrainCircuit,
  Mic, MicOff, Volume2, Info, Sparkles, Users,
  FastForward, Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

// ==========================================
// 1. API CONFIGURATION (GROQ)
// ==========================================
const GROQ_API_KEY = ""; 
const GROQ_MODEL = "llama-3.1-8b-instant"; 

type Role = 'user' | 'ai1' | 'ai2';
type Message = { role: Role, name: string, text: string };

// ==========================================
// 5 COMPANIES & DYNAMIC TOPICS
// ==========================================
const COMPANY_TOPICS: Record<string, string> = {
  "Google": "Cloud computing is more of a security risk than on-premise infrastructure.",
  "Microsoft": "Does a college degree still matter in the tech industry today?",
  "Amazon": "Is the trade-off of user privacy for hyper-personalized shopping experiences ethical?",
  "Meta": "The Metaverse and VR will eventually replace traditional remote work environments.",
  "TCS": "The shift from service-based to product-based IT models in India is unsustainable."
};

export default function GroupDiscussion() {
  const { submitRound } = useAppStore();
  const navigate = useNavigate();

  // --- NEW DROPDOWN STATE ---
  const [selectedCompany, setSelectedCompany] = useState<string>("Google");
  const debateTopic = COMPANY_TOPICS[selectedCompany];

  // GD Sequence States
  const [hasStarted, setHasStarted] = useState(false);
  const [isBotsTalking, setIsBotsTalking] = useState(false); 
  const [skipCount, setSkipCount] = useState(0);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  const [activeTypist, setActiveTypist] = useState<'none' | 'Priya' | 'Rahul'>('none');
  const [isListening, setIsListening] = useState(false);
  
  // Evaluation State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<{ score: string, feedback: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // ==========================================
  // 2. VOICE INTEGRATION (STT & TTS)
  // ==========================================
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN'; 

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  const speak = (text: string, persona: 'Priya' | 'Rahul', onEnd?: () => void) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();

      if (persona === 'Priya') {
        utterance.voice = voices.find(v => 
          v.name.includes('Google US English Female') || 
          v.name.includes('Female') || 
          v.name.includes('Zira') || 
          v.name.includes('Samantha')
        ) || voices[0];
        utterance.pitch = 1.2;
        utterance.rate = 1.0;
      } else {
        utterance.voice = voices.find(v => 
          v.name.includes('Google US English Male') || 
          v.name.includes('Male') || 
          v.name.includes('David') || 
          v.name.includes('Alex')
        ) || voices[1];
        utterance.pitch = 0.8; 
        utterance.rate = 0.95;
      }

      if (onEnd) {
        utterance.onend = onEnd;
        utterance.onerror = onEnd;
      }
      window.speechSynthesis.speak(utterance);
    } else {
      if (onEnd) onEnd();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTypist]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      window.speechSynthesis.cancel();
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  // ==========================================
  // 3. START SEQUENCE
  // ==========================================
  const handleStartGD = () => {
    setHasStarted(true);
    setIsBotsTalking(true);
    setActiveTypist('Priya');

    const msg1 = { role: 'ai1', name: 'Priya', text: `Hi everyone. The topic today is: '${debateTopic}'. I think we should start by defining the core arguments.` };
    const msg2 = { role: 'ai2', name: 'Rahul', text: `Agreed, Priya. Let's hear what our third team member thinks before we dive in deep.` };

    setTimeout(() => {
      setMessages([msg1 as Message]);
      setActiveTypist('none');
      
      speak(msg1.text, 'Priya', () => {
        setActiveTypist('Rahul');
        setTimeout(() => {
          setMessages([msg1 as Message, msg2 as Message]);
          setActiveTypist('none');
          
          speak(msg2.text, 'Rahul', () => {
            setIsBotsTalking(false);
          });
        }, 1000); 
      });
    }, 1500);
  };

  // ==========================================
  // 4. CORE AI LOGIC
  // ==========================================
  const callGroq = async (systemPrompt: string, userMessage: string) => {
    if (!GROQ_API_KEY) throw new Error("API Key Missing");

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
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 200, 
      }),
    });

    if (!response.ok) throw new Error("Groq API Error");
    const data = await response.json();
    return data.choices[0].message.content.trim();
  };

  const getPersonaResponse = async (name: string, trait: string, chatHistory: Message[], skipped: boolean = false) => {
    const transcript = chatHistory.map(m => `${m.name}: ${m.text}`).join('\n');
    const systemPrompt = `
      You are ${name}, participating in a 3-person corporate Group Discussion.
      Topic: "${debateTopic}"
      Your personality: ${trait}.

      INSTRUCTIONS:
      1. Read the transcript below.
      2. Provide your next verbal response.
      ${skipped ? "3. The user has chosen to pass their turn and remain quiet. Continue the discussion with the other AI peer naturally." : "3. You can agree, disagree, or build upon what the others (especially 'You') just said."}
      4. Keep it natural, conversational, and UNDER 3 sentences. Be a team player.
      5. DO NOT output labels, asterisks, or your name. Just the spoken text.
    `;
    
    return await callGroq(systemPrompt, `Transcript:\n${transcript}\n\nWhat does ${name} say next?`);
  };

  const handleAction = async (userText: string | null) => {
    if (activeTypist !== 'none' || isBotsTalking) return;

    let updatedMessages: Message[] = [...messages];

    if (userText) {
      updatedMessages.push({ role: 'user', name: 'You', text: userText });
      setInput('');
    } else {
      setSkipCount(prev => prev + 1);
    }
    
    setMessages(updatedMessages);
    window.speechSynthesis.cancel();

    try {
      setActiveTypist('Priya');
      const priyaResponse = await getPersonaResponse('Priya', 'Analytical and polite', updatedMessages, !userText);
      const priyaState = [...updatedMessages, { role: 'ai1', name: 'Priya', text: priyaResponse } as Message];
      setMessages(priyaState);
      
      speak(priyaResponse, 'Priya', async () => {
        setActiveTypist('Rahul');
        const rahulResponse = await getPersonaResponse('Rahul', 'Strategic and slightly challenging', priyaState, !userText);
        setMessages([...priyaState, { role: 'ai2', name: 'Rahul', text: rahulResponse }]);
        setActiveTypist('none');
        speak(rahulResponse, 'Rahul');
      });
    } catch (e) {
      setActiveTypist('none');
    }
  };

  const handleEvaluate = async () => {
    if (messages.length < 5) {
      alert("Please engage in the discussion more before concluding.");
      return;
    }
    
    setIsEvaluating(true);
    try {
      const fullTranscript = messages.map(m => `${m.name}: ${m.text}`).join('\n\n');

      const judgePrompt = `
        You are a Senior Recruitment Lead evaluating the human candidate ('You') in a 3-person Group Discussion for ${selectedCompany}.
        Topic: "${debateTopic}"
        
        Evaluate the candidate ('You') based on:
        - Communication and clarity
        - Team play
        - Logical coherence
        Note: The user skipped their turn ${skipCount} times. If this number is high, penalize their participation score.
        
        FORMAT: <score>0-100</score><feedback>Short analytical paragraph</feedback>
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
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 relative">
            <Users size={28} />
            <motion.div 
              animate={{ scale: isListening ? [1, 1.2, 1] : 1 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${isListening ? 'bg-red-500' : 'bg-emerald-500'}`}
            />
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-900 tracking-tight leading-none">Group Discussion Room</h2>
            <div className="flex items-center gap-2 mt-2">
               <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1"><Building size={10}/> {selectedCompany}</span>
               <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest bg-zinc-100 px-2 py-0.5 rounded-md truncate max-w-[200px]">Topic: {debateTopic}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {hasStarted && !evaluation && (
            <button 
              onClick={() => handleAction(null)} 
              disabled={isBotsTalking || activeTypist !== 'none'} 
              className="flex items-center gap-2 px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all border border-zinc-200 disabled:opacity-50"
            >
              <FastForward size={16} /> Pass Turn
            </button>
          )}

          {hasStarted && !evaluation && (
            <button 
              onClick={handleEvaluate}
              disabled={isEvaluating || activeTypist !== 'none' || isBotsTalking}
              className="bg-zinc-900 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center gap-2 active:scale-95 shadow-xl shadow-zinc-900/10"
            >
              {isEvaluating ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
              End GD
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          
          {/* WAITING ROOM VIEW (Before Start) */}
          {!hasStarted && !evaluation ? (
            <motion.div 
              key="start"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border border-zinc-200 shadow-sm p-8 text-center"
            >
              
              <h3 className="text-3xl font-black text-zinc-900 mb-6 tracking-tight">Set Up Your GD</h3>
              
              {/* DROPDOWN MENU ADDED HERE */}
              <div className="mb-8 w-full max-w-md flex flex-col items-center gap-2 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Select Target Company</label>
                <select 
                  value={selectedCompany} 
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:border-indigo-500 transition-all cursor-pointer text-center"
                >
                  {Object.keys(COMPANY_TOPICS).map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>

              <p className="text-zinc-500 mb-10 max-w-lg text-lg leading-relaxed">
                You will enter a 3-person discussion. Your topic is:<br/>
                <strong className="text-zinc-900 text-xl block mt-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">"{debateTopic}"</strong>
              </p>
              
              <button 
                onClick={handleStartGD}
                className="bg-emerald-500 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center gap-3"
              >
                <Mic size={24} /> Enter Room & Start
              </button>
            </motion.div>
          ) : !evaluation ? (

            /* ACTIVE CHAT VIEW */
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
                      msg.role === 'user' ? 'bg-emerald-500 text-white border-emerald-400' : 
                      msg.role === 'ai1' ? 'bg-indigo-500 text-white border-indigo-400' :
                      'bg-orange-500 text-white border-orange-400'
                    }`}>
                      {msg.role === 'user' ? <User size={18} /> : <BrainCircuit size={18} />}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-1 ${
                        msg.role === 'user' ? 'text-right text-emerald-600' : 
                        msg.role === 'ai1' ? 'text-indigo-600' : 'text-orange-600'
                      }`}>
                        {msg.name}
                      </span>
                      <div className={`p-5 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-emerald-600 text-white rounded-[24px] rounded-tr-sm' 
                          : msg.role === 'ai1'
                          ? 'bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-[24px] rounded-tl-sm'
                          : 'bg-orange-50 border border-orange-100 text-orange-900 rounded-[24px] rounded-tl-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {/* DYNAMIC TYPING INDICATOR */}
                {activeTypist !== 'none' && (
                  <div className="flex gap-4 max-w-[80%]">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border text-white ${
                      activeTypist === 'Priya' ? 'bg-indigo-500 border-indigo-400' : 'bg-orange-500 border-orange-400'
                    }`}>
                      <BrainCircuit size={18} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-1 ${
                        activeTypist === 'Priya' ? 'text-indigo-600' : 'text-orange-600'
                      }`}>
                        {activeTypist} is preparing...
                      </span>
                      <div className={`p-5 border rounded-[24px] rounded-tl-sm flex items-center gap-2 ${
                        activeTypist === 'Priya' ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'
                      }`}>
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className={`w-2 h-2 rounded-full ${activeTypist === 'Priya' ? 'bg-indigo-400' : 'bg-orange-400'}`} />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className={`w-2 h-2 rounded-full ${activeTypist === 'Priya' ? 'bg-indigo-400' : 'bg-orange-400'}`} />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className={`w-2 h-2 rounded-full ${activeTypist === 'Priya' ? 'bg-indigo-400' : 'bg-orange-400'}`} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT AREA */}
              <div className="p-6 bg-white border-t border-zinc-100">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleAction(input); }} 
                  className="flex gap-4 max-w-5xl mx-auto relative items-center"
                >
                  <button 
                    type="button" 
                    onClick={toggleListening}
                    disabled={activeTypist !== 'none' || isBotsTalking}
                    className={`p-5 rounded-2xl border-2 transition-all flex-shrink-0 ${
                      isListening 
                        ? 'bg-red-50 border-red-200 text-red-500 animate-pulse shadow-lg shadow-red-500/10' 
                        : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:text-emerald-500 hover:border-emerald-200 disabled:opacity-50'
                    }`}
                  >
                    {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>

                  <div className="relative flex-1 group">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={activeTypist !== 'none' || isBotsTalking}
                      placeholder={
                        isBotsTalking ? "Listen to the opening statements..." :
                        isListening ? "Listening..." : "Add your point to the discussion..."
                      }
                      className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[24px] px-8 py-5 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-medium pr-20 text-zinc-700 disabled:opacity-50"
                    />
                    <button 
                      type="submit" 
                      disabled={!input.trim() || activeTypist !== 'none' || isBotsTalking}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </form>
                
                <div className="flex justify-center mt-4 gap-6">
                   <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                     <Volume2 size={12} className="text-emerald-500" /> Auto-Voice Active
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                     <Users size={12} /> Priya, Rahul, You
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
              
              <h3 className="text-4xl font-black text-zinc-900 tracking-tight mb-2">GD Evaluation</h3>
              <p className="text-zinc-500 font-medium text-lg mb-10">Your collaborative discussion skills have been analyzed.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                <div className="bg-zinc-50 p-10 rounded-[40px] border border-zinc-100 flex flex-col items-center justify-center">
                  <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Overall Score</p>
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
                  {skipCount > 0 && (
                    <p className="mt-4 text-xs font-bold text-orange-600 bg-orange-50 p-3 rounded-xl border border-orange-100">
                      Note: You passed your turn {skipCount} time(s). Passive participation can impact your final score.
                    </p>
                  )}
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