import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  MessageSquare, 
  Activity,
  User,
  Sparkles,
  Send,
  X,
  Clock,
  Briefcase,
  Target,
  Info,
  Lightbulb,
  RotateCcw,
  Camera,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore, useAppStore } from '../store/useStore';
import { generateRoundFeedback } from '../services/geminiService';

export default function HRInterview() {
  const { user } = useAuthStore();
  const { currentSession, hrGender, hrTone, submitRound } = useAppStore();
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transcripts, setTranscripts] = useState([
    { role: 'interviewer', text: "Hello " + (user?.name?.split(' ')[0] || 'Candidate') + "! I'm your AI interviewer for today. Let's start with a brief introduction. Can you tell me about yourself and your experience relevant to this role?", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  ]);
  const [inputText, setInputText] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const hrImages = {
    female: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
    male: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80'
  };

  useEffect(() => {
    const startCamera = async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Error accessing media devices:", err);
        if (err.name === 'NotAllowedError') {
          setCameraError("Camera access denied. Please enable permissions in your browser settings.");
        } else if (err.name === 'NotFoundError') {
          setCameraError("No camera or microphone detected. Please connect your devices.");
        } else {
          setCameraError("Failed to access camera. Please check your hardware.");
        }
        setIsCameraOn(false);
      }
    };

    if (isCameraOn) {
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOn]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    const newMessage = {
      role: 'user',
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setTranscripts(prev => [...prev, newMessage]);
    setInputText('');
    
    // Simulate AI response
    setTimeout(() => {
      setTranscripts(prev => [...prev, {
        role: 'interviewer',
        text: "That's very interesting. Can you elaborate more on your specific contributions in your last project?",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1500);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const performanceData = {
        transcripts,
        hrTone,
        hrGender,
        duration: '15 minutes'
      };
      
      const feedback = await generateRoundFeedback('HR Interview', performanceData);
      // Mock score calculation
      const score = Math.floor(Math.random() * 20) + 75; // 75-95
      
      submitRound(score, feedback);
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-240px)] flex flex-col bg-white rounded-[40px] overflow-hidden border border-zinc-200 shadow-sm">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat & HR Image */}
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-zinc-200 relative">
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {/* HR Image (The "Interviewer") */}
            <div className="flex justify-center mb-12">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group"
              >
                <div className="absolute -inset-4 bg-emerald-500/10 rounded-[40px] blur-2xl group-hover:bg-emerald-500/20 transition-all" />
                <div className="relative w-48 h-48 rounded-[40px] overflow-hidden border-4 border-white shadow-2xl">
                  <img 
                    src={hrImages[hrGender]} 
                    alt="HR Interviewer" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <p className="text-white text-[10px] font-bold text-center capitalize">AI Interviewer ({hrTone})</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Transcript Bubbles */}
            <div className="space-y-8 max-w-3xl mx-auto">
              {transcripts.map((t, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${t.role === 'interviewer' ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                    t.role === 'interviewer' ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-400'
                  }`}>
                    {t.role === 'interviewer' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className={`flex flex-col ${t.role === 'interviewer' ? 'items-start' : 'items-end'} max-w-[80%]`}>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm border ${
                      t.role === 'interviewer' 
                        ? 'bg-white text-zinc-900 border-zinc-100 rounded-tl-none' 
                        : 'bg-emerald-50 text-emerald-900 border-emerald-100 rounded-tr-none'
                    }`}>
                      {t.text}
                    </div>
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-2">
                      {t.role === 'interviewer' ? 'AI Interviewer' : 'You'} • {t.time}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Floating Camera Preview (PiP Style) */}
          <div className="absolute bottom-6 right-6 w-48 aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-white z-20 group">
            {isCameraOn && !cameraError ? (
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 p-4 text-center">
                {cameraError ? (
                  <>
                    <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
                    <p className="text-[8px] text-zinc-400 font-bold uppercase leading-tight">{cameraError}</p>
                  </>
                ) : (
                  <>
                    <VideoOff className="w-6 h-6 text-zinc-600 mb-2" />
                    <p className="text-[8px] text-zinc-400 font-bold uppercase">Camera Off</p>
                  </>
                )}
              </div>
            )}
            <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
              <div className={`w-1 h-1 rounded-full ${isCameraOn ? 'bg-red-500 animate-pulse' : 'bg-zinc-500'}`} />
              <span className="text-[6px] text-white font-bold uppercase tracking-widest">You</span>
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button 
                onClick={() => setIsCameraOn(!isCameraOn)}
                className="p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition-all"
              >
                {isCameraOn ? <Video className="w-4 h-4 text-white" /> : <VideoOff className="w-4 h-4 text-white" />}
              </button>
              <button 
                onClick={() => setIsMicOn(!isMicOn)}
                className="p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition-all"
              >
                {isMicOn ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-white" />}
              </button>
            </div>
          </div>

          {/* Bottom Input Area */}
          <div className="p-6 border-t border-zinc-100 bg-white">
            <div className="max-w-4xl mx-auto flex items-center gap-4">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your response..."
                  className="w-full pl-6 pr-12 py-4 rounded-2xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm font-medium"
                />
                <button 
                  onClick={handleSendMessage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-xl shadow-zinc-900/10 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Submit Interview
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Analysis & Context */}
        <div className="w-72 bg-zinc-50/50 p-6 overflow-y-auto space-y-6">
          {/* AI Analysis */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AI Analysis</span>
              <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Real-time</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900">Confident</p>
                <p className="text-[8px] text-zinc-500 font-medium">Emotion Indicator</p>
              </div>
            </div>
          </div>

          {/* Interview Context */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Context</span>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Briefcase className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Role</p>
                  <p className="text-[10px] font-bold text-zinc-900">Senior Designer</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Target className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Focus</p>
                  <p className="text-[10px] font-bold text-zinc-900">Leadership</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tip Box */}
          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex gap-3">
            <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-[10px] text-emerald-800 leading-relaxed font-medium">
              <span className="font-bold">Tip:</span> Use the STAR method for behavioral questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

