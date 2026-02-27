"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  MessageSquare,
  User,
  Sparkles,
  Send,
  Lightbulb,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Play,
  Activity 
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore, useAppStore } from "../store/useStore";
import { generateRoundFeedback } from "../services/geminiService";
import { GoogleGenerativeAI } from "@google/generative-ai"; 

// ==========================================
// 1. API CONFIGURATION (DUAL-MODEL SETUP)
// ==========================================
const GEMINI_API_KEY = ""; // <-- Used for Facial Analysis
const GROQ_API_KEY = "";     // <-- Used for Real-time Chat

export default function HRInterview() {
  const { user } = useAuthStore();
  const { hrGender, hrTone, submitRound } = useAppStore();

  const [hasStarted, setHasStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finalFeedback, setFinalFeedback] = useState<string | null>(null);

  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // --- Facial Analysis State ---
  const [confidenceScore, setConfidenceScore] = useState(85);
  const [instantFeedback, setInstantFeedback] = useState("Looking good. Maintain this posture.");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [transcripts, setTranscripts] = useState([
    {
      role: "interviewer",
      text:
        "Hello " +
        (user?.name?.split(" ")[0] || "Candidate") +
        "! I'm your AI interviewer for today. Let's start with a brief introduction. Can you tell me about yourself and your experience relevant to this role?",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [inputText, setInputText] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const hrImages = {
    female: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
    male: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80",
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts, isThinking]);

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = hrGender === "female" ? 1.2 : 0.9;
        window.speechSynthesis.speak(utterance);
      }, 100);
    }
  };

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-IN";

      recognitionRef.current.onresult = (event: any) => {
        let completeTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          completeTranscript += event.results[i][0].transcript;
        }
        setInputText(completeTranscript);
      };

      recognitionRef.current.onend = () => setIsMicOn(false);
      recognitionRef.current.onerror = () => setIsMicOn(false);
    }

    return () => {
      window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  const handleStartInterview = () => {
    setHasStarted(true);
    speak(transcripts[0].text);
  };

  const toggleMic = () => {
    if (isMicOn) {
      recognitionRef.current?.stop();
    } else {
      setInputText("");
      try {
        recognitionRef.current?.start();
        setIsMicOn(true);
      } catch (e) {
        console.error("Mic already started or failed", e);
      }
    }
  };

  useEffect(() => {
    const startCamera = async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        setCameraError("Failed to access camera.");
        setIsCameraOn(false);
      }
    };

    if (hasStarted && isCameraOn && !isFinished) startCamera();
    else if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    return () => {
      if (streamRef.current)
        streamRef.current.getTracks().forEach((track) => track.stop());
    };
  }, [isCameraOn, hasStarted, isFinished]);

  // ==========================================
  // MODEL 1: FACIAL ANALYSIS USING GEMINI 1.5 FLASH
  // ==========================================
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const analyzeFace = async () => {
      if (!isCameraOn || !videoRef.current || !canvasRef.current || isFinished || GEMINI_API_KEY.includes("YOUR_GEMINI_API_KEY")) return;

      setIsAnalyzing(true);
      try {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = 400; 
        canvas.height = 300;
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        const base64Image = canvas.toDataURL('image/jpeg', 0.5);
        const base64Data = base64Image.split(',')[1];

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        // Ensure we are using the stable 1.5-flash version for vision
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = "Analyze this candidate's face and posture in an interview. Reply ONLY with a raw JSON object containing two keys: 'score' (a number between 40 and 100 based on their confidence/eye contact) and 'feedback' (a 3 to 6 word tip like 'Make more eye contact' or 'Great posture'). Do not include markdown formatting or backticks.";
        
        const imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const content = result.response.text();
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.score) setConfidenceScore(Number(parsed.score));
          if (parsed.feedback) setInstantFeedback(parsed.feedback);
        }

      } catch (error) {
        console.error("Facial analysis error:", error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    if (hasStarted && isCameraOn && !isFinished) {
      intervalId = setInterval(analyzeFace, 8000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [hasStarted, isCameraOn, isFinished]);

  // ==========================================
  // MODEL 2: CHAT ENGINE USING GROQ (LLAMA 3)
  // ==========================================
  const handleSendMessage = async () => {
    if (!inputText.trim() || isThinking) return;

    if (isMicOn) recognitionRef.current?.stop();
    window.speechSynthesis.cancel();

    const newMessage = {
      role: "user",
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newTranscripts = [...transcripts, newMessage];
    setTranscripts(newTranscripts);
    setInputText("");
    setIsThinking(true);

    try {
      if (!GROQ_API_KEY || GROQ_API_KEY.includes("YOUR_GROQ_API_KEY")) {
        throw new Error("Please add your Groq API Key at the top of the file.");
      }

      // Convert standard transcripts to Groq/OpenAI role format
      const formattedHistory = newTranscripts.map(msg => ({
        role: msg.role === 'interviewer' ? 'assistant' : 'user',
        content: msg.text
      }));

      // Prepend the System Prompt to guide the HR Interviewer's behavior
      formattedHistory.unshift({
        role: "system",
        content: `You are a Senior HR Interviewer. You are conducting an initial screening interview with ${user?.name || "a candidate"}. 
        Your tone should be ${hrTone || "professional"}. 
        Keep your responses extremely conversational, brief (1-3 sentences max), and ask ONE relevant follow-up question based on what the candidate just said. Do not output markdown.`
      });

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // Fast Llama 3 model
          messages: formattedHistory,
          temperature: 0.7,
          max_tokens: 150,
        }),
      });

      if (!response.ok) throw new Error("Failed to connect to Groq API");
      const data = await response.json();
      const aiResponseText = data.choices[0].message.content.trim();

      setTranscripts((prev) => [
        ...prev,
        {
          role: "interviewer",
          text: aiResponseText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      speak(aiResponseText);
    } catch (error) {
      console.error(error);
      speak("I am having trouble connecting. Could you repeat that?");
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();

    try {
      // Kept Gemini for final analytics generation as it is good at extracting JSON structured feedback
      const performanceData = {
        transcripts,
        hrTone,
        hrGender,
        duration: "15 minutes",
        averageConfidence: confidenceScore 
      };
      const feedback = await generateRoundFeedback(
        "HR Interview",
        performanceData,
      );

      const score = Math.floor(Math.random() * 20) + 75;
      if (submitRound) submitRound(score, feedback);

      setFinalFeedback(feedback);
      setIsFinished(true);
    } catch (error) {
      alert("Failed to generate feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormattedFeedback = (text: string) => {
    return text.split("\n").map((line, index) => {
      if (line.trim() === "") return <div key={index} className="h-2" />;

      if (line.startsWith("## ")) {
        return <h3 key={index} className="text-xl font-bold text-zinc-900 mt-6 mb-3">{line.substring(3)}</h3>;
      }
      if (line.startsWith("# ")) {
        return <h2 key={index} className="text-2xl font-bold text-zinc-900 mt-6 mb-4">{line.substring(2)}</h2>;
      }

      const parseBold = (str: string) => {
        const parts = str.split(/\*\*(.*?)\*\*/g);
        return parts.map((part, i) =>
          i % 2 === 1 ? <strong key={i} className="text-zinc-900 font-bold">{part}</strong> : part
        );
      };

      if (line.startsWith("* ") || line.startsWith("- ")) {
        return <li key={index} className="ml-6 mb-2 text-zinc-700 list-disc marker:text-emerald-500">{parseBold(line.substring(2))}</li>;
      }

      return <p key={index} className="mb-2 text-zinc-700 leading-relaxed">{parseBold(line)}</p>;
    });
  };

  if (!hasStarted) {
    return (
      <div className="h-[calc(100vh-240px)] flex flex-col items-center justify-center bg-white rounded-[40px] border border-zinc-200 shadow-sm text-center p-8">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
          <MessageSquare className="w-12 h-12 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-bold text-zinc-900 mb-4">Ready for your interview?</h2>
        <p className="text-zinc-500 max-w-md mb-8">
          Make sure your microphone and camera are ready. The AI Interviewer
          will speak out loud, so ensure your volume is up.
        </p>
        <button
          onClick={handleStartInterview}
          className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          Start Interview
        </button>
      </div>
    );
  }

  if (isFinished && finalFeedback) {
    return (
      <div className="h-[calc(100vh-240px)] flex flex-col bg-white rounded-[40px] overflow-hidden border border-zinc-200 shadow-sm p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-4 mb-8 border-b border-zinc-100 pb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-zinc-900">Interview Complete</h2>
              <p className="text-zinc-500">Here is your detailed AI performance analysis.</p>
            </div>
          </div>

          <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100">
            {renderFormattedFeedback(finalFeedback)}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={() => window.location.reload()}
              className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Start New Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-240px)] flex flex-col bg-white rounded-[40px] overflow-hidden border border-zinc-200 shadow-sm">
      {/* Hidden canvas used to capture frames for the vision model */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white relative">
          <div className="flex-1 overflow-y-auto p-8 space-y-8 pb-32">
            <div className="flex justify-center mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group"
              >
                <div className="absolute -inset-4 bg-emerald-500/10 rounded-[40px] blur-2xl transition-all" />
                <div className="relative w-48 h-48 rounded-[40px] overflow-hidden border-4 border-white shadow-2xl">
                  <img
                    src={hrImages[hrGender as keyof typeof hrImages] || hrImages.female}
                    alt="HR"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <p className="text-white text-[10px] font-bold text-center capitalize">
                      AI Interviewer ({hrTone || "Professional"})
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="space-y-8 max-w-3xl mx-auto">
              {transcripts.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${t.role === "interviewer" ? "flex-row" : "flex-row-reverse"}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${t.role === "interviewer" ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400"}`}>
                    {t.role === "interviewer" ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className={`flex flex-col ${t.role === "interviewer" ? "items-start" : "items-end"} max-w-[80%]`}>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm border ${t.role === "interviewer" ? "bg-white text-zinc-900 border-zinc-100 rounded-tl-none" : "bg-emerald-50 text-emerald-900 border-emerald-100 rounded-tr-none"}`}>
                      {t.text}
                    </div>
                  </div>
                </motion.div>
              ))}

              {isThinking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 flex-row">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-zinc-100 rounded-tl-none shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    <span className="text-sm text-zinc-500">Evaluating...</span>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Bottom Input Area */}
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-zinc-100 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="max-w-5xl mx-auto flex items-end gap-3">
              <button
                onClick={toggleMic}
                className={`h-[60px] px-6 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-sm border ${
                  isMicOn ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 animate-pulse" : "bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200"
                }`}
              >
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                {isMicOn ? "Recording..." : "Speak"}
              </button>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={isMicOn ? "Listening... (Hit send when done)" : "Type your response or click Speak..."}
                disabled={isThinking}
                rows={2}
                className="flex-1 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm font-medium disabled:opacity-50 resize-none overflow-y-auto"
              />

              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isThinking}
                className="h-[60px] w-[60px] flex items-center justify-center bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-md flex-shrink-0"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-zinc-50/50 p-6 overflow-y-auto border-l border-zinc-200 flex flex-col gap-6">
          <div className="w-full aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-zinc-200 relative group shrink-0">
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
                <VideoOff className="w-6 h-6 text-zinc-600 mb-2" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => setIsCameraOn(!isCameraOn)}
                className="p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition-all"
              >
                {isCameraOn ? <Video className="w-4 h-4 text-white" /> : <VideoOff className="w-4 h-4 text-white" />}
              </button>
            </div>
            <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
              <div className={`w-1 h-1 rounded-full ${isCameraOn ? "bg-red-500 animate-pulse" : "bg-zinc-500"}`} />
              <span className="text-[8px] text-white font-bold uppercase tracking-widest">You</span>
            </div>
          </div>

          {/* LIVE FACIAL ANALYSIS WIDGET */}
          {isCameraOn && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity size={14} className={isAnalyzing ? "text-emerald-500 animate-pulse" : "text-zinc-400"} />
                  Live Posture Analysis
                </h4>
                {isAnalyzing && <span className="text-[8px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">SCANNING</span>}
              </div>

              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-2xl font-black text-zinc-900 tracking-tight">{confidenceScore}%</span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Confidence</span>
                </div>
                <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${confidenceScore}%` }}
                    className={`h-full ${confidenceScore > 70 ? 'bg-emerald-500' : confidenceScore > 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                  />
                </div>
              </div>

              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                  {instantFeedback}
                </p>
              </div>
            </div>
          )}

          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex gap-3 shrink-0 mt-auto">
            <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-[10px] text-emerald-800 leading-relaxed font-medium">
              <span className="font-bold">Tip:</span> Ensure you have good lighting. Our vision AI is tracking your eye contact and posture in real-time.
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-zinc-900 text-white px-6 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-zinc-900/10 disabled:opacity-50 shrink-0"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            Finish Interview
          </button>
        </div>
      </div>
    </div>
  );
}