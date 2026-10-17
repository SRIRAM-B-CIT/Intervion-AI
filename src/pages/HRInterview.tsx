"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Video, Mic, MicOff, VideoOff, MessageSquare, User, Sparkles, Send,
  Lightbulb, RotateCcw, Loader2, CheckCircle2, Play, Activity, Briefcase,
  Volume2, VolumeX, AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore, useAppStore } from "../store/useStore";
import { generateRoundFeedback, generateHRResponse } from "../services/geminiService";
import { faceLandmarkerService } from "../services/faceLandmarkerService";
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import LanguageSelector from "../components/LanguageSelector";
import { SupportedLanguage, getLanguageOption, isIndianLanguage } from "../types/language";
import { sarvamService } from "../services/sarvamService";
import { audioRecordingService } from "../services/audioRecordingService";

// ==========================================
// 1. API CONFIGURATION
// ==========================================
const GROQ_API_KEY =
  (import.meta.env.VITE_GROQ_API_KEY as string | undefined) || "";

const WORKING_GROQ_MODELS = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "allam-2-7b",
];

// Job Roles for Dropdown
const JOB_ROLES = [
  "Software Development Engineer (SDE)",
  "Frontend React Developer",
  "Product Manager",
  "Data Analyst",
  "Cloud Solutions Architect"
];

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

  // --- NEW: Role Selection State ---
  const [selectedRole, setSelectedRole] = useState(JOB_ROLES[0]);

  // --- Multilingual State ---
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>("en");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [sarvamError, setSarvamError] = useState<string | null>(null);

  // --- Facial Analysis State ---
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [instantFeedback, setInstantFeedback] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [transcripts, setTranscripts] = useState([
    {
      role: "interviewer",
      text: `Hello ${user?.name?.split(" ")[0] || "Candidate"}! I'm your AI HR Manager today. I see you're interviewing for the ${selectedRole} position. Let's start with a brief introduction—can you walk me through your background and why you are interested in this specific role?`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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

  // ==========================================
  // VOICE ENGINE (GENDER SPECIFIC)
  // ==========================================
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  const speak = async (text: string) => {
    try {
      await TextToSpeech.stop();
      const { voices } = await TextToSpeech.getSupportedVoices();
      let voiceIdx = -1;

      if (hrGender === "female") {
        const femaleVoice = voices.findIndex(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha'));
        if (femaleVoice !== -1) voiceIdx = femaleVoice;
      } else {
        const maleVoice = voices.findIndex(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('alex'));
        if (maleVoice !== -1) voiceIdx = maleVoice;
      }

      const opts: any = {
        text,
        lang: 'en-US',
        pitch: hrGender === "female" ? 1.1 : 0.8,
        rate: 1.0
      };
      if (voiceIdx !== -1) opts.voice = voiceIdx;

      await TextToSpeech.speak(opts);
    } catch (e) {
      console.warn("TTS failed, falling back to Web API", e);
      if ("speechSynthesis" in window && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text);
          const voices = window.speechSynthesis.getVoices();

          if (hrGender === "female") {
            utterance.voice = voices.find(v => v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Google US English Female')) || voices[0];
            utterance.pitch = 1.1;
          } else {
            utterance.voice = voices.find(v => v.name.includes('Male') || v.name.includes('David') || v.name.includes('Alex') || v.name.includes('Google US English Male')) || voices[1];
            utterance.pitch = 0.8;
          }
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
        }, 100);
      }
    }
  };

  // MULTILINGUAL VOICE ENGINE (Branches between English & Sarvam AI)
  const speakInterviewer = async (text: string, cacheKey?: string) => {
    setSarvamError(null);
    sarvamService.stopAudio();

    if (selectedLanguage === "en") {
      // 100% UNCHANGED ENGLISH VOICE PATH
      await speak(text);
      return;
    }

    // MULTILINGUAL (HINDI / TAMIL / TELUGU / MALAYALAM) VIA SARVAM TTS
    try {
      setIsPlayingAudio(true);
      await sarvamService.speak(text, selectedLanguage, {
        gender: hrGender === "female" ? "female" : "male",
        cacheKey,
        onStart: () => setIsPlayingAudio(true),
        onEnd: () => setIsPlayingAudio(false),
        onError: (err) => {
          console.warn("Sarvam TTS error:", err);
          setIsPlayingAudio(false);
          setSarvamError("Sarvam TTS playback unavailable. Continuing with text interaction.");
        },
      });
    } catch (err) {
      console.warn("Failed to invoke Sarvam TTS:", err);
      setIsPlayingAudio(false);
    }
  };

  const getInitialGreeting = (lang: SupportedLanguage, name: string, role: string) => {
    const candidateName = name.split(" ")[0] || "Candidate";
    switch (lang) {
      case "hi-IN":
        return `नमस्ते ${candidateName}! मैं आज आपकी AI HR मैनेजर हूँ। मैं देख रही हूँ कि आप ${role} पद के लिए इंटरव्यू दे रहे हैं। आइए एक संक्षिप्त परिचय से शुरुआत करते हैं—कृपया अपनी पृष्ठभूमि के बारे में बताएं और आप इस भूमिका में क्यों रुचि रखते हैं?`;
      case "ta-IN":
        return `வணக்கம் ${candidateName}! நான் இன்று உங்கள் AI HR மேனேஜர். நீங்கள் ${role} பணிக்காக நேர்காணலில் பங்கேற்கிறீர்கள் என்று அறிகிறேன். ஒரு சிறிய அறிமுகத்துடன் தொடங்குவோம்—உங்கள் பின்னணி மற்றும் இந்த பணியில் உங்களுக்கு ஏன் ஆர்வம் உள்ளது என்பதைப் பற்றி பகிருங்கள்?`;
      case "te-IN":
        return `నమస్కారం ${candidateName}! నేను ఈరోజు మీ AI HR మేనేజర్ని. మీరు ${role} స్థానం కోసం ఇంటర్వ్యూకి హాజరవుతున్నారని తెలుస్తోంది. క్లుప్తమైన పరిచయంతో ప్రారంభిద్దాం—మీ నేపథ్యం మరియు ఈ ఉద్యోగంపై మీకు ఎందుకు ఆసక్తి ఉందో వివరించగలరా?`;
      case "ml-IN":
        return `നമസ്കാരം ${candidateName}! ഞാൻ ഇന്ന് നിങ്ങളുടെ AI HR മാനേജരാണ്. നിങ്ങൾ ${role} തസ്തികയിലേക്ക് ഇൻ്റർവ്യൂവിൽ പങ്കെടുക്കുകയാണെന്ന് കാണുന്നു. ഒരു ലഘുവായ ആമുഖത്തോടെ നമുക്ക് ആരംഭിക്കാം—നിങ്ങളുടെ പശ്ചാത്തലത്തെക്കുറിച്ചും ഈ റോളിൽ നിങ്ങൾക്ക് താൽപ്പര്യമുള്ളത് എന്തുകൊണ്ടാണെന്നും പറയാമോ?`;
      case "en":
      default:
        return `Hello ${candidateName}! I'm your AI HR Manager today. I see you're interviewing for the ${role} position. Let's start with a brief introduction—can you walk me through your background and why you are interested in this specific role?`;
    }
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
      try { TextToSpeech.stop(); } catch (e) { }
      if ('speechSynthesis' in window && window.speechSynthesis) if ("speechSynthesis" in window && window.speechSynthesis) window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  const handleStartInterview = () => {
    setHasStarted(true);
    faceLandmarkerService.resetSession();
    sarvamService.stopAudio();

    const introText = getInitialGreeting(selectedLanguage, user?.name || "Candidate", selectedRole);

    setTranscripts([{
      role: "interviewer",
      text: introText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);

    speakInterviewer(introText, "hr-intro");
  };

  const toggleMic = async () => {
    if (isMicOn) {
      if (selectedLanguage === "en") {
        recognitionRef.current?.stop();
        setIsMicOn(false);
      } else {
        // Stop recording with MediaRecorder and send to Sarvam STT
        setIsMicOn(false);
        setIsTranscribing(true);
        setSarvamError(null);
        try {
          const recorded = await audioRecordingService.stopRecording();
          const transcript = await sarvamService.transcribe(
            recorded.base64,
            selectedLanguage,
            recorded.mimeType
          );
          if (transcript) {
            setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
          }
        } catch (err: any) {
          console.error("Sarvam STT failed:", err);
          setSarvamError(err.message || "Failed to transcribe audio. You can type your response below.");
        } finally {
          setIsTranscribing(false);
        }
      }
    } else {
      sarvamService.stopAudio();
      try { await TextToSpeech.stop(); } catch (e) { }
      if ("speechSynthesis" in window && window.speechSynthesis) window.speechSynthesis.cancel();
      setSarvamError(null);

      if (selectedLanguage === "en") {
        // EXACT EXISTING ENGLISH LOGIC - untouched
        setInputText("");
        try {
          recognitionRef.current?.start();
          setIsMicOn(true);
        } catch (e) {
          console.error("Mic already started or failed", e);
        }
      } else {
        // Sarvam STT Recording path
        try {
          await audioRecordingService.startRecording();
          setIsMicOn(true);
        } catch (err: any) {
          console.error("Audio recording failed to start:", err);
          setSarvamError(err.message || "Microphone access denied. You can type your response below.");
          setIsMicOn(false);
        }
      }
    }
  };

  useEffect(() => {
    const startCamera = async () => {
      try {
        setCameraError(null);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API not supported on this device/browser.");
        }
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
  // FACIAL ANALYSIS: IN-BROWSER MEDIAPIPE FACE LANDMARKER
  // ==========================================
  useEffect(() => {
    let isCancelled = false;
    let timerId: any = null;

    if (hasStarted && isCameraOn && !isFinished) {
      setInstantFeedback("Initializing facial analysis...");

      // Initialize FaceLandmarker (GPU with CPU fallback)
      faceLandmarkerService.initialize().then(() => {
        if (isCancelled) return;
        setInstantFeedback("Good alignment and posture");
      }).catch((err) => {
        console.warn("FaceLandmarker initialization warning:", err);
      });

      // Frame-processing loop throttled to ~400ms (2.5 FPS)
      // Processes video frames directly in the browser with zero UI lag
      const runFrame = () => {
        if (isCancelled || isFinished || !isCameraOn) return;

        if (videoRef.current) {
          setIsAnalyzing(true);
          try {
            const analysis = faceLandmarkerService.processVideoFrame(videoRef.current);
            if (analysis && !isCancelled) {
              setConfidenceScore(analysis.postureScore);
              setInstantFeedback(analysis.feedback);
            }
          } catch (err) {
            console.warn("Facial analysis frame error:", err);
          } finally {
            if (!isCancelled) {
              setTimeout(() => {
                if (!isCancelled) setIsAnalyzing(false);
              }, 120);
            }
          }
        }

        if (!isCancelled && !isFinished && isCameraOn) {
          timerId = setTimeout(runFrame, 400);
        }
      };

      // Start processing after a brief delay to allow video stream to settle
      timerId = setTimeout(runFrame, 600);
    } else if (!isCameraOn) {
      setInstantFeedback("Camera paused");
      setConfidenceScore(0);
    }

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
      setIsAnalyzing(false);
    };
  }, [hasStarted, isCameraOn, isFinished]);

  // Clean up MediaPipe & Sarvam resources when component unmounts
  useEffect(() => {
    return () => {
      faceLandmarkerService.close();
      sarvamService.stopAudio();
      audioRecordingService.cancelRecording();
    };
  }, []);

  // ==========================================
  // MODEL 2: CHAT ENGINE USING GROQ (LLAMA 3)
  // ==========================================
  const handleSendMessage = async () => {
    if (!inputText.trim() || isThinking) return;

    if (isMicOn) {
      if (selectedLanguage === "en") recognitionRef.current?.stop();
      else audioRecordingService.cancelRecording();
      setIsMicOn(false);
    }
    sarvamService.stopAudio();
    if ("speechSynthesis" in window && window.speechSynthesis) window.speechSynthesis.cancel();

    const newMessage = {
      role: "user",
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newTranscripts = [...transcripts, newMessage];
    setTranscripts(newTranscripts);
    setInputText("");
    setIsThinking(true);
    setSarvamError(null);

    try {
      const formattedHistory = newTranscripts.map(msg => ({
        role: msg.role === 'interviewer' ? 'assistant' : 'user',
        content: msg.text
      }));

      const langOpt = getLanguageOption(selectedLanguage);
      let systemPrompt = "";

      if (selectedLanguage === "en") {
        // EXACT EXISTING ENGLISH SYSTEM PROMPT
        systemPrompt = `You are a Senior HR Interviewer. You are interviewing ${user?.name || "a candidate"} for the role of ${selectedRole}. 
        Your tone should be ${hrTone || "professional"}. 
        Keep your responses extremely conversational, brief (1-3 sentences max), and ask ONE relevant follow-up question based on what the candidate just said and how it relates to the ${selectedRole} position. Do not output markdown.`;
      } else {
        // MULTILINGUAL PROMPT FOR HINDI / TAMIL / TELUGU / MALAYALAM
        systemPrompt = `You are a Senior HR Interviewer interviewing ${user?.name || "a candidate"} for the position of ${selectedRole}.
        Your tone should be ${hrTone || "professional"}.
        LANGUAGE REQUIREMENT: Respond STRICTLY in ${langOpt.label} (${langOpt.nativeName}) script.
        Common technical terms, frameworks, tools, company names, and programming keywords (such as React, TypeScript, Python, API, Git, Cloud, AWS, Database, Frontend) should remain in English where natural in professional Indian tech interviews.
        Keep your response natural, conversational, brief (1-3 sentences max), and ask ONE relevant follow-up question based on the candidate's last answer. Do not output markdown or prefixes like "HR:".`;
      }

      formattedHistory.unshift({
        role: "system",
        content: systemPrompt
      });

      let aiResponseText = "";
      for (const model of WORKING_GROQ_MODELS) {
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: formattedHistory,
              temperature: 0.7,
              max_completion_tokens: 512,
            }),
          });

          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Groq API error (${response.status}) on ${model}: ${errorBody}`);
          }
          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content?.trim();
          if (content) {
            aiResponseText = content;
            break;
          }
        } catch (err) {
          console.warn(`HR Chat model ${model} failed, trying next:`, err);
        }
      }

      // If Groq models failed, fallback to Gemini HR generator
      if (!aiResponseText) {
        try {
          const geminiHistory = newTranscripts.map((t) => ({
            role: t.role,
            text: t.text,
          }));
          aiResponseText = await generateHRResponse(geminiHistory);
        } catch (geminiErr) {
          console.error("Gemini HR fallback failed:", geminiErr);
          aiResponseText = selectedLanguage === "en"
            ? "Could you elaborate on how your background prepares you for this role?"
            : "क्या आप विस्तार से बता सकते हैं कि आपका अनुभव आपको इस पद के लिए कैसे तैयार करता है?";
        }
      }

      setTranscripts((prev) => [
        ...prev,
        {
          role: "interviewer",
          text: aiResponseText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      speakInterviewer(aiResponseText, `hr-${newTranscripts.length}`);
    } catch (error) {
      console.error(error);
      const errGreeting = selectedLanguage === "en"
        ? "I am having trouble connecting. Could you repeat that?"
        : "संपर्क करने में कुछ कठिनाई हो रही है। क्या आप इसे दोहरा सकते हैं?";
      speakInterviewer(errGreeting);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    recognitionRef.current?.stop();
    if ("speechSynthesis" in window && window.speechSynthesis) window.speechSynthesis.cancel();

    try {
      const sessionSummary = faceLandmarkerService.getSessionSummary();
      const avgConfidence = sessionSummary.averageAlignmentScore || confidenceScore || 80;

      const performanceData = {
        transcripts,
        hrTone,
        hrGender,
        role: selectedRole,
        duration: "15 minutes",
        averageConfidence: avgConfidence,
        facialAnalysis: {
          averagePostureScore: avgConfidence,
          faceVisibilityRate: `${sessionSummary.faceVisibilityRate}%`,
          positionStability: `${sessionSummary.stabilityScore}%`,
          totalFramesAnalyzed: sessionSummary.totalFramesAnalyzed,
        }
      };
      const feedback = await generateRoundFeedback("HR Interview", performanceData);

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
      if (line.startsWith("## ")) return <h3 key={index} className="text-xl font-bold text-zinc-900 mt-6 mb-3">{line.substring(3)}</h3>;
      if (line.startsWith("# ")) return <h2 key={index} className="text-2xl font-bold text-zinc-900 mt-6 mb-4">{line.substring(2)}</h2>;

      const parseBold = (str: string) => {
        const parts = str.split(/\*\*(.*?)\*\*/g);
        return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-zinc-900 font-bold">{part}</strong> : part);
      };

      if (line.startsWith("* ") || line.startsWith("- ")) {
        return <li key={index} className="ml-6 mb-2 text-zinc-700 list-disc marker:text-emerald-500">{parseBold(line.substring(2))}</li>;
      }
      return <p key={index} className="mb-2 text-zinc-700 leading-relaxed">{parseBold(line)}</p>;
    });
  };

  // ==========================================
  // RENDER: PHASE 1 (START / ROLE SELECTION)
  // ==========================================
  if (!hasStarted) {
    return (
      <div className="flex-1 min-h-[600px] md:min-h-0 flex flex-col items-center justify-center bg-white rounded-3xl md:rounded-[40px] border border-zinc-200 shadow-sm text-center p-4 md:p-8">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
          <Briefcase className="w-12 h-12 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-bold text-zinc-900 mb-2">Setup Your Interview</h2>
        <p className="text-zinc-500 max-w-md mb-8">
          Select the role you are applying for. The HR AI will tailor its questions to match this position.
        </p>

        {/* Role Selection Dropdown */}
        <div className="mb-6 w-full max-w-xs flex flex-col items-center gap-2 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Target Role</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:border-emerald-500 transition-all cursor-pointer text-center"
          >
            {JOB_ROLES.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        {/* Language Selection Dropdown */}
        <div className="mb-10 w-full max-w-xs">
          <LanguageSelector
            value={selectedLanguage}
            onChange={setSelectedLanguage}
            variant="card"
          />
        </div>

        <button
          onClick={handleStartInterview}
          className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          Enter Interview Room
        </button>
      </div>
    );
  }

  // ==========================================
  // RENDER: PHASE 3 (FEEDBACK)
  // ==========================================
  if (isFinished && finalFeedback) {
    return (
      <div className="flex-1 min-h-[600px] md:min-h-0 flex flex-col bg-white rounded-3xl md:rounded-[40px] overflow-hidden border border-zinc-200 shadow-sm p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-4 mb-8 border-b border-zinc-100 pb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-zinc-900">Interview Complete</h2>
              <p className="text-zinc-500">Here is your detailed AI performance analysis for the {selectedRole} role.</p>
            </div>
          </div>

          <div className="bg-zinc-50 p-4 md:p-8 rounded-3xl border border-zinc-100">
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

  // ==========================================
  // RENDER: PHASE 2 (INTERVIEW)
  // ==========================================
  return (
    <div className="flex-1 min-h-[600px] md:min-h-0 flex flex-col bg-white rounded-3xl md:rounded-[40px] overflow-hidden border border-zinc-200 shadow-sm">
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white relative">
          {/* Top In-Round Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-100 bg-zinc-50/70 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Role:</span>
              <span className="text-xs font-bold text-zinc-800 bg-white px-2.5 py-1 rounded-lg border border-zinc-200">
                {selectedRole}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector
                value={selectedLanguage}
                onChange={setSelectedLanguage}
                variant="compact"
              />
            </div>
          </div>

          {/* Sarvam Error Alert */}
          {sarvamError && (
            <div className="mx-6 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800 shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{sarvamError}</span>
              </div>
              <button
                onClick={() => setSarvamError(null)}
                className="text-amber-700 hover:text-amber-900 font-bold ml-2 underline text-[11px]"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Transcription In Progress Alert */}
          {isTranscribing && (
            <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 animate-pulse shrink-0">
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
              <span>Transcribing your speech with Sarvam AI ({getLanguageOption(selectedLanguage).nativeName})...</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-32">
            <div className="flex justify-center mb-12">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative group">
                <div className="absolute -inset-4 bg-emerald-500/10 rounded-3xl md:rounded-[40px] blur-2xl transition-all" />
                <div className="relative w-48 h-48 rounded-3xl md:rounded-[40px] overflow-hidden border-4 border-white shadow-2xl">
                  <img src={hrImages[hrGender as keyof typeof hrImages] || hrImages.female} alt="HR" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <p className="text-white text-[10px] font-bold text-center capitalize">
                      HR ({hrTone || "Professional"})
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="space-y-8 max-w-3xl mx-auto">
              {transcripts.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-4 ${t.role === "interviewer" ? "flex-row" : "flex-row-reverse"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${t.role === "interviewer" ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400"}`}>
                    {t.role === "interviewer" ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className={`flex flex-col ${t.role === "interviewer" ? "items-start" : "items-end"} max-w-[80%]`}>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm border ${t.role === "interviewer" ? "bg-white text-zinc-900 border-zinc-100 rounded-tl-none" : "bg-emerald-50 text-emerald-900 border-emerald-100 rounded-tr-none"}`}>
                      {t.text}
                      {t.role === "interviewer" && isIndianLanguage(selectedLanguage) && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => speakInterviewer(t.text, `hr-${i}`)}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Replay Voice</span>
                          </button>
                          {isPlayingAudio && (
                            <button
                              type="button"
                              onClick={() => {
                                sarvamService.stopAudio();
                                setIsPlayingAudio(false);
                              }}
                              className="text-xs text-zinc-500 hover:text-zinc-700 flex items-center gap-1 bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              <VolumeX className="w-3 h-3" />
                              <span>Stop</span>
                            </button>
                          )}
                        </div>
                      )}
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
                type="button"
                onClick={toggleMic}
                disabled={isTranscribing || isThinking}
                className={`h-[60px] px-6 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-sm border disabled:opacity-50 ${isMicOn
                    ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 animate-pulse"
                    : isTranscribing
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200"
                  }`}
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                    Transcribing...
                  </>
                ) : isMicOn ? (
                  <>
                    <Mic className="w-5 h-5" />
                    {selectedLanguage === "en" ? "Recording..." : "Stop & Transcribe"}
                  </>
                ) : (
                  <>
                    <MicOff className="w-5 h-5" />
                    Speak
                  </>
                )}
              </button>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder={isMicOn ? "Listening... (Hit send when done)" : "Type your response or click Speak..."}
                disabled={isThinking}
                rows={2}
                className="flex-1 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm font-medium disabled:opacity-50 resize-none overflow-y-auto"
              />

              <button onClick={handleSendMessage} disabled={!inputText.trim() || isThinking} className="h-[60px] w-[60px] flex items-center justify-center bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-md flex-shrink-0">
                <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full md:w-80 min-h-[400px] md:h-auto bg-zinc-50/50 p-6 overflow-y-auto border-t md:border-t-0 md:border-l border-zinc-200 flex flex-col gap-6">
          <div className="w-full aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-zinc-200 relative group shrink-0">
            {isCameraOn && !cameraError ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 p-4 text-center">
                <VideoOff className="w-6 h-6 text-zinc-600 mb-2" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button onClick={() => setIsCameraOn(!isCameraOn)} className="p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition-all">
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
                  Live Posture
                </h4>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-2xl font-black text-zinc-900 tracking-tight">{confidenceScore}%</span>
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
                <p className="text-xs text-zinc-600 font-medium leading-relaxed">{instantFeedback}</p>
              </div>
            </div>
          )}

          <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-zinc-900 text-white px-6 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-zinc-900/10 disabled:opacity-50 mt-auto shrink-0">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            Finish Interview
          </button>
        </div>
      </div>
    </div>
  );
}
