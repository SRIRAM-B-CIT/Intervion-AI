"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Send, Loader2, Target, CheckCircle2,
  AlertTriangle, ChevronRight, User, BrainCircuit,
  Mic, MicOff, Volume2, VolumeX, Info, Sparkles, Users,
  FastForward, Building, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { useAppStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import LanguageSelector from '../components/LanguageSelector';
import { SupportedLanguage, getLanguageOption, isIndianLanguage, GD_VOICES } from '../types/language';
import { sarvamService } from '../services/sarvamService';
import { audioRecordingService } from '../services/audioRecordingService';

// ==========================================
// 1. API CONFIGURATION (GROQ)
// ==========================================
const GROQ_API_KEY =
  (import.meta.env.VITE_GROQ_API_KEY as string | undefined) || "";
const WORKING_GROQ_MODELS = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "allam-2-7b",
];

type Role = 'user' | 'ai1' | 'ai2';
type Message = { role: Role, name: string, text: string };

// ==========================================
// 5 COMPANIES & MULTILINGUAL DYNAMIC TOPICS
// ==========================================
const COMPANY_TOPICS: Record<string, string> = {
  "Google": "Cloud computing is more of a security risk than on-premise infrastructure.",
  "Microsoft": "Does a college degree still matter in the tech industry today?",
  "Amazon": "Is the trade-off of user privacy for hyper-personalized shopping experiences ethical?",
  "Meta": "The Metaverse and VR will eventually replace traditional remote work environments.",
  "TCS": "The shift from service-based to product-based IT models in India is unsustainable."
};

const COMPANY_TOPICS_MULTILINGUAL: Record<string, Record<SupportedLanguage, string>> = {
  "Google": {
    en: "Cloud computing is more of a security risk than on-premise infrastructure.",
    "hi-IN": "क्लाउड कंप्यूटिंग ऑन-प्रिमाइसेस इंफ्रास्ट्रक्चर की तुलना में अधिक सुरक्षा जोखिम है।",
    "ta-IN": "ஆன்-பிரைமைஸ் கட்டமைப்பை விட கிளவுட் கம்ப்யூட்டிங் அதிக பாதுகாப்பு அபாயத்தைக் கொண்டுள்ளது.",
    "te-IN": "ఆన్-ప్రిమైసెస్ మౌలిక సదుపాయాల కంటే క్లౌడ్ కంప్యూటింగ్ ఎక్కువ భద్రతా ప్రమాదం కలిగిస్తుంది.",
    "ml-IN": "ഓൺ-പ്രിമൈസസ് ഇൻഫ്രാസ്ട്രക്ചറിനേക്കാൾ ക്ലൗഡ് കമ്പ്യൂട്ടിംഗ് കൂടുതൽ സുരക്ഷാ ഭീഷണിയാണ്.",
  },
  "Microsoft": {
    en: "Does a college degree still matter in the tech industry today?",
    "hi-IN": "क्या आज के टेक उद्योग में कॉलेज की डिग्री का कोई महत्व रह गया है?",
    "ta-IN": "இன்றைய தொழில்நுட்பத் துறையில் கல்லூரிப் பட்டம் இன்னும் முக்கியத்துவம் வாய்ந்ததா?",
    "te-IN": "నేటి టెక్ పరిశ్రమలో కాలేజీ డిగ్రీకి ఇంకా ప్రాముఖ్యత ఉందా?",
    "ml-IN": "ഇന്നത്തെ ടെക് ഇൻഡസ്ട്രിയിൽ കോളേജ് ബിരുദത്തിന് ഇനിയും പ്രസക്തിയുണ്ടോ?",
  },
  "Amazon": {
    en: "Is the trade-off of user privacy for hyper-personalized shopping experiences ethical?",
    "hi-IN": "हाइपर-पर्सनलाइज्ड शॉपिंग अनुभवों के लिए उपयोगकर्ता की गोपनीयता का समझौता क्या नैतिक है?",
    "ta-IN": "அதிக தனிப்பயனாக்கப்பட்ட ஷாப்பிங் அனுபவங்களுக்காக பயனர் தனியுரிமையை தியாகம் செய்வது நெறிமுறை சார்ந்ததா?",
    "te-IN": "వ్యక్తిగతీకరించిన షాపింగ్ అనుభవాల కోసం యూజర్ గోప్యతను త్యాగం చేయడం నైతికమైనదేనా?",
    "ml-IN": "ഹൈപ്പർ-വ്യക്തിഗതമാക്കിയ ഷോപ്പിംഗ് അനുഭവങ്ങൾക്കായി ഉപയോക്തൃ സ്വകാര്യത നഷ്ടപ്പെടുത്തുന്നത് ധാർമ്മികമാണോ?",
  },
  "Meta": {
    en: "The Metaverse and VR will eventually replace traditional remote work environments.",
    "hi-IN": "मेटावर्स और वीआर अंततः पारंपरिक रिमोट वर्क वर्कप्लेस की जगह ले लेंगे।",
    "ta-IN": "மெட்டாவர்ஸ் மற்றும் விஆர் இறுதியில் பாரம்பரிய தொலைதூர பணிச்சூழல்களை மாற்றிவிடும்.",
    "te-IN": "మెటావర్స్ మరియు VR చివరికి సాంప్రదాయ రిమోట్ వర్క్ వాతావరణాలను భర్తీ చేస్తాయి.",
    "ml-IN": "മെറ്റാവേഴ്സും വിആറും പരമ്പരാഗത വിദൂര തൊഴിൽ അന്തരീക്ഷങ്ങളെ മാറ്റിസ്ഥാപിക്കും.",
  },
  "TCS": {
    en: "The shift from service-based to product-based IT models in India is unsustainable.",
    "hi-IN": "भारत में सर्विस-आधारित से प्रोडक्ट-आधारित आईटी मॉडल की ओर बदलाव टिकाऊ नहीं है।",
    "ta-IN": "இந்தியாவில் சேவை சார்ந்த ஐடி மாதிரிகளிலிருந்து தயாரிப்பு சார்ந்த மாதிரிகளுக்கு மாறுவது நிலைக்க முடியாதது.",
    "te-IN": "భారతదేశంలో సర్వీస్ ఆధారిత ఐటి నుండి ప్రొడక్ట్ ఆధారిత నమూనాలకు మారడం నిలకడగా ఉండదు.",
    "ml-IN": "ഇന്ത്യയിൽ സർവീസ് അധിഷ്ഠിതത്തിൽ നിന്ന് പ്രൊഡക്റ്റ് അധിഷ്ഠിത ഐടി മോഡലുകളിലേക്കുള്ള മാറ്റം നിലനിൽപ്പില്ലാത്തതാണ്.",
  },
};

const getDebateTopic = (company: string, lang: SupportedLanguage): string => {
  return COMPANY_TOPICS_MULTILINGUAL[company]?.[lang] || COMPANY_TOPICS[company] || "The role of technology in modern business.";
};

export default function GroupDiscussion() {
  const { submitRound } = useAppStore();
  const navigate = useNavigate();

  // --- NEW DROPDOWN STATE ---
  const [selectedCompany, setSelectedCompany] = useState<string>("Google");

  // --- MULTILINGUAL STATE ---
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>("en");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [sarvamError, setSarvamError] = useState<string | null>(null);

  const debateTopic = getDebateTopic(selectedCompany, selectedLanguage);

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

    return () => {
      try { TextToSpeech.stop(); } catch (e) { }
      if ('speechSynthesis' in window && window.speechSynthesis) window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
      sarvamService.stopAudio();
      audioRecordingService.cancelRecording();
    };
  }, []);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // ENGLISH TTS ENGINE - 100% UNCHANGED
  const speak = async (text: string, persona: 'Priya' | 'Rahul', onEnd?: () => void) => {
    try {
      const { voices } = await TextToSpeech.getSupportedVoices();
      let voiceIdx = -1;

      if (persona === 'Priya') {
        const femaleVoice = voices.findIndex(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha'));
        if (femaleVoice !== -1) voiceIdx = femaleVoice;
      } else {
        const maleVoice = voices.findIndex(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('alex'));
        if (maleVoice !== -1) voiceIdx = maleVoice;
      }

      const opts: any = {
        text,
        lang: 'en-US',
        pitch: persona === 'Priya' ? 1.2 : 0.8,
        rate: persona === 'Priya' ? 1.0 : 0.95
      };

      if (voiceIdx !== -1) opts.voice = voiceIdx;

      await TextToSpeech.speak(opts);
      if (onEnd) onEnd();
    } catch (e) {
      console.warn("TTS Failed, falling back to Web API", e);
      // Fallback
      if ('speechSynthesis' in window && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        if (persona === 'Priya') {
          utterance.voice = voices.find(v => v.name.includes('Female')) || voices[0];
          utterance.pitch = 1.2;
        } else {
          utterance.voice = voices.find(v => v.name.includes('Male')) || voices[1];
          utterance.pitch = 0.8;
        }
        if (onEnd) {
          utterance.onend = onEnd;
          utterance.onerror = onEnd;
        }
        window.speechSynthesis.speak(utterance);
      } else {
        if (onEnd) onEnd();
      }
    }
  };

  // MULTILINGUAL HYBRID GD VOICE ENGINE (Branches between English & Sarvam AI)
  const speakGD = async (text: string, persona: 'Priya' | 'Rahul', onEnd?: () => void, cacheKey?: string) => {
    setSarvamError(null);
    sarvamService.stopAudio();

    if (selectedLanguage === "en") {
      // 100% UNCHANGED ENGLISH VOICE PATH
      await speak(text, persona, onEnd);
      return;
    }

    // MULTILINGUAL VIA SARVAM TTS (Hindi, Tamil, Telugu, Malayalam)
    try {
      setIsPlayingAudio(true);
      const speaker = GD_VOICES[selectedLanguage]?.[persona === 'Priya' ? 'priya' : 'rahul'];
      await sarvamService.speak(text, selectedLanguage, {
        speaker,
        gender: persona === 'Priya' ? 'female' : 'male',
        cacheKey,
        onStart: () => setIsPlayingAudio(true),
        onEnd: () => {
          setIsPlayingAudio(false);
          if (onEnd) onEnd();
        },
        onError: (err) => {
          console.warn("Sarvam GD TTS playback error:", err);
          setIsPlayingAudio(false);
          setSarvamError("Sarvam TTS playback unavailable. Continuing with text interaction.");
          if (onEnd) onEnd();
        }
      });
    } catch (err) {
      console.warn("Failed to invoke Sarvam GD TTS:", err);
      setIsPlayingAudio(false);
      if (onEnd) onEnd();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTypist]);

  // STT TOGGLE: English uses browser Web Speech; Indian languages use Sarvam STT
  const toggleListening = async () => {
    // Echo protection: Do not record if bots are speaking or transcribing
    if (activeTypist !== 'none' || isBotsTalking || isPlayingAudio || isTranscribing) return;

    if (isListening) {
      if (selectedLanguage === "en") {
        recognitionRef.current?.stop();
        setIsListening(false);
      } else {
        // Stop recording with MediaRecorder and send to Sarvam STT
        setIsListening(false);
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
            setInput(prev => prev ? `${prev} ${transcript}` : transcript);
          }
        } catch (err: any) {
          console.error("Sarvam STT failed in GD:", err);
          setSarvamError(err.message || "Failed to transcribe audio. You can type your response below.");
        } finally {
          setIsTranscribing(false);
        }
      }
    } else {
      sarvamService.stopAudio();
      try { await TextToSpeech.stop(); } catch (e) { }
      if ('speechSynthesis' in window && window.speechSynthesis) window.speechSynthesis.cancel();
      setSarvamError(null);

      if (selectedLanguage === "en") {
        setIsListening(true);
        try {
          recognitionRef.current?.start();
        } catch (e) {
          console.error("Speech recognition error:", e);
          setIsListening(false);
        }
      } else {
        // Sarvam STT Recording path
        try {
          await audioRecordingService.startRecording();
          setIsListening(true);
        } catch (err: any) {
          console.error("Audio recording failed to start in GD:", err);
          setSarvamError(err.message || "Microphone access denied. You can type your response below.");
          setIsListening(false);
        }
      }
    }
  };

  // ==========================================
  // 3. START SEQUENCE (MULTILINGUAL)
  // ==========================================
  const getOpeningStatements = (lang: SupportedLanguage, topic: string) => {
    switch (lang) {
      case "hi-IN":
        return {
          msg1: `नमस्ते सबको। आज का हमारा विषय है: '${topic}'। मुझे लगता है कि हमें मुख्य बिंदुओं को परिभाषित करके शुरुआत करनी चाहिए।`,
          msg2: `बिल्कुल प्रिया। गहराई से चर्चा करने से पहले आइए सुनते हैं कि हमारी टीम के तीसरे साथी का इस पर क्या विचार है।`
        };
      case "ta-IN":
        return {
          msg1: `அனைவருக்கும் வணக்கம். இன்றைய தலைப்பு: '${topic}'. நாம் முக்கிய கருத்துக்களை வரையறுப்பதன் மூலம் விவாதத்தைத் தொடங்கலாம் என்று கருதுகிறேன்.`,
          msg2: `சரிதான் பிரியா. நாம் ஆழமாக விவாதிப்பதற்கு முன், நமது மூன்றாவது குழு உறுப்பினர் என்ன நினைக்கிறார் என்பதைக் கேட்போம்.`
        };
      case "te-IN":
        return {
          msg1: `అందరికీ నమస్కారం. ఈరోజు మన చర్చనీయాంశం: '${topic}'. ప్రధాన అంశాలను విశ్లేషించడం ద్వారా ప్రారంభిద్దామని నేను భావిస్తున్నాను.`,
          msg2: `సరే ప్రియా. మనం లోతుగా చర్చించే ముందు మన మూడవ సహచరుడు దీనిపై ఏమనుకుంటున్నారో తెలుసుకుందాం.`
        };
      case "ml-IN":
        return {
          msg1: `എല്ലാവർക്കും നമസ്കാരം. ഇന്നത്തെ നമ്മുടെ വിഷയം: '${topic}'. പ്രധാന വാദമുഖങ്ങൾ വ്യക്തമാക്കിക്കൊണ്ട് നമുക്ക് ചർച്ച ആരംഭിക്കാമെന്ന് കരുതുന്നു.`,
          msg2: `തീർച്ചയായും പ്രിയാ. നമ്മൾ കൂടുതൽ ആഴത്തിൽ ചർച്ച ചെയ്യുന്നതിന് മുൻപ് നമ്മുടെ മൂന്നാമത്തെ ടീം അംഗത്തിന് എന്താണ് പറയാനുള്ളതെന്ന് കേൾക്കാം.`
        };
      case "en":
      default:
        return {
          msg1: `Hi everyone. The topic today is: '${topic}'. I think we should start by defining the core arguments.`,
          msg2: `Agreed, Priya. Let's hear what our third team member thinks before we dive in deep.`
        };
    }
  };

  const handleStartGD = () => {
    setHasStarted(true);
    setIsBotsTalking(true);
    setActiveTypist('Priya');
    setSarvamError(null);
    sarvamService.stopAudio();

    const topic = getDebateTopic(selectedCompany, selectedLanguage);
    const { msg1: msg1Text, msg2: msg2Text } = getOpeningStatements(selectedLanguage, topic);

    const msg1 = { role: 'ai1', name: 'Priya', text: msg1Text };
    const msg2 = { role: 'ai2', name: 'Rahul', text: msg2Text };

    setTimeout(() => {
      setMessages([msg1 as Message]);
      setActiveTypist('none');

      // Sequential Voice Playback: Priya speaks first, then Rahul speaks strictly on Priya's completion
      speakGD(msg1.text, 'Priya', () => {
        setActiveTypist('Rahul');
        setTimeout(() => {
          setMessages([msg1 as Message, msg2 as Message]);
          setActiveTypist('none');

          speakGD(msg2.text, 'Rahul', () => {
            setIsBotsTalking(false);
          }, `gd-intro-rahul-${selectedLanguage}`);
        }, 1000);
      }, `gd-intro-priya-${selectedLanguage}`);
    }, 1500);
  };

  // ==========================================
  // 4. CORE AI LOGIC
  // ==========================================
  const callGroq = async (systemPrompt: string, userMessage: string) => {
    if (!GROQ_API_KEY) throw new Error("API Key Missing");

    let lastError: unknown = null;

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
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage }
            ],
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
          return content;
        }
      } catch (err) {
        console.warn(`Groq model ${model} attempt failed:`, err);
        lastError = err;
      }
    }

    throw lastError || new Error("All Groq models failed to return content");
  };

  const getPersonaResponse = async (name: string, trait: string, chatHistory: Message[], skipped: boolean = false) => {
    const transcript = chatHistory.map(m => `${m.name}: ${m.text}`).join('\n');
    const topic = getDebateTopic(selectedCompany, selectedLanguage);
    const langOpt = getLanguageOption(selectedLanguage);

    let systemPrompt = "";

    if (selectedLanguage === "en") {
      // 100% UNCHANGED ENGLISH PROMPT
      systemPrompt = `
      You are ${name}, participating in a 3-person corporate Group Discussion.
      Topic: "${topic}"
      Your personality: ${trait}.

      INSTRUCTIONS:
      1. Read the transcript below.
      2. Provide your next verbal response.
      ${skipped ? "3. The user has chosen to pass their turn and remain quiet. Continue the discussion with the other AI peer naturally." : "3. You can agree, disagree, or build upon what the others (especially 'You') just said."}
      4. Keep it natural, conversational, and UNDER 3 sentences. Be a team player.
      5. DO NOT output labels, asterisks, or your name. Just the spoken text.
    `;
    } else {
      // MULTILINGUAL PROMPT FOR INDIAN LANGUAGES
      systemPrompt = `
      You are ${name}, participating in a 3-person corporate Group Discussion for ${selectedCompany}.
      Topic: "${topic}"
      Your personality: ${trait}.

      LANGUAGE REQUIREMENT: Respond STRICTLY in ${langOpt.label} (${langOpt.nativeName}) script.
      Common English technical, business, and industry terms (e.g., Cloud, AI, VR, Privacy, Startup, IT, Security, Degree, ROI) should remain in English where natural in professional Indian corporate discussions.

      INSTRUCTIONS:
      1. Read the transcript below.
      2. Provide your next verbal response in ${langOpt.nativeName}.
      ${skipped ? "3. The user has chosen to pass their turn and remain quiet. Continue the discussion with the other AI peer naturally in the selected language." : "3. You can agree, disagree, or build upon what the others (especially 'You') just said."}
      4. Keep it natural, conversational, and UNDER 3 sentences. Be a team player.
      5. DO NOT output labels, asterisks, or your name. Just the spoken text in ${langOpt.nativeName}.
    `;
    }

    return await callGroq(systemPrompt, `Transcript:\n${transcript}\n\nWhat does ${name} say next?`);
  };

  const handleAction = async (userText: string | null) => {
    if (activeTypist !== 'none' || isBotsTalking) return;

    // Echo protection: Mute/stop any active mic recording immediately
    if (isListening) {
      if (selectedLanguage === "en") recognitionRef.current?.stop();
      else audioRecordingService.cancelRecording();
      setIsListening(false);
    }
    sarvamService.stopAudio();
    try { await TextToSpeech.stop(); } catch (e) { }
    if ('speechSynthesis' in window && window.speechSynthesis) window.speechSynthesis.cancel();
    setSarvamError(null);

    let updatedMessages: Message[] = [...messages];

    if (userText) {
      updatedMessages.push({ role: 'user', name: 'You', text: userText });
      setInput('');
    } else {
      setSkipCount(prev => prev + 1);
    }

    setMessages(updatedMessages);

    try {
      setIsBotsTalking(true);
      setActiveTypist('Priya');
      const priyaResponse = await getPersonaResponse('Priya', 'Analytical and polite', updatedMessages, !userText);
      const priyaState = [...updatedMessages, { role: 'ai1', name: 'Priya', text: priyaResponse } as Message];
      setMessages(priyaState);

      // Sequential turn-based audio: Priya speaks first, Rahul speaks only after Priya finishes
      speakGD(priyaResponse, 'Priya', async () => {
        try {
          setActiveTypist('Rahul');
          const rahulResponse = await getPersonaResponse('Rahul', 'Strategic and slightly challenging', priyaState, !userText);
          setMessages([...priyaState, { role: 'ai2', name: 'Rahul', text: rahulResponse }]);
          setActiveTypist('none');
          speakGD(rahulResponse, 'Rahul', () => {
            setIsBotsTalking(false);
          }, `gd-rahul-${priyaState.length}`);
        } catch (e: any) {
          console.error("Rahul response failed:", e);
          setActiveTypist('none');
          setIsBotsTalking(false);
          alert(e instanceof Error ? e.message : "The AI did not return an answer. Please try again.");
        }
      }, `gd-priya-${updatedMessages.length}`);
    } catch (e: any) {
      console.error("Group discussion response failed:", e);
      setActiveTypist('none');
      setIsBotsTalking(false);
      alert(e instanceof Error ? e.message : "The AI did not return an answer. Please try again.");
    }
  };

  const handleEvaluate = async () => {
    if (messages.length < 5) {
      alert("Please engage in the discussion more before concluding.");
      return;
    }

    setIsEvaluating(true);
    sarvamService.stopAudio();
    try {
      const fullTranscript = messages.map(m => `${m.name}: ${m.text}`).join('\n\n');
      const topic = getDebateTopic(selectedCompany, selectedLanguage);
      const langOpt = getLanguageOption(selectedLanguage);

      let judgePrompt = "";
      if (selectedLanguage === "en") {
        judgePrompt = `
        You are a Senior Recruitment Lead evaluating the human candidate ('You') in a 3-person Group Discussion for ${selectedCompany}.
        Topic: "${topic}"
        
        Evaluate the candidate ('You') based on:
        - Communication and clarity
        - Team play
        - Logical coherence
        Note: The user skipped their turn ${skipCount} times. If this number is high, penalize their participation score.
        
        FORMAT: <score>0-100</score><feedback>Short analytical paragraph</feedback>
      `;
      } else {
        judgePrompt = `
        You are a Senior Recruitment Lead evaluating the human candidate ('You') in a 3-person Group Discussion for ${selectedCompany}.
        Topic: "${topic}"
        Discussion Language: ${langOpt.label} (${langOpt.nativeName}).
        
        Evaluate the candidate ('You') based on:
        - Communication and clarity in ${langOpt.label}
        - Team play and collaborative responsiveness
        - Logical coherence and quality of arguments
        Note: The user skipped their turn ${skipCount} times. If this number is high, penalize their participation score.
        
        Provide constructive evaluation feedback in ${langOpt.label} (${langOpt.nativeName}) script.
        FORMAT: <score>0-100</score><feedback>Short analytical paragraph in ${langOpt.nativeName}</feedback>
      `;
      }

      const aiResponse = await callGroq(judgePrompt, `Transcript:\n${fullTranscript}`);
      const scoreMatch = aiResponse.match(/<score>([\s\S]*?)<\/score>/i);
      const feedbackMatch = aiResponse.match(/<feedback>([\s\S]*?)<\/feedback>/i);

      setEvaluation({
        score: scoreMatch ? scoreMatch[1].trim() : "78",
        feedback: feedbackMatch ? feedbackMatch[1].trim() : aiResponse
      });

    } catch (error) {
      console.error("Group discussion evaluation failed:", error);
      alert(error instanceof Error ? error.message : "Evaluation failed.");
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
    <div className="flex-1 min-h-[600px] md:min-h-0 flex flex-col gap-4 p-4 bg-[#f8fafc]">

      {/* Header Section */}
      <div className="flex items-center justify-between bg-white p-5 rounded-[28px] border border-zinc-200 shadow-sm shrink-0 flex-wrap gap-4">
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
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1"><Building size={10} /> {selectedCompany}</span>
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest bg-zinc-100 px-2 py-0.5 rounded-md truncate max-w-[260px]">Topic: {debateTopic}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector
            value={selectedLanguage}
            onChange={setSelectedLanguage}
            variant="compact"
          />

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
              className="h-full flex flex-col items-center justify-center bg-white rounded-3xl md:rounded-[40px] border border-zinc-200 shadow-sm p-4 md:p-8 text-center overflow-y-auto"
            >

              <h3 className="text-3xl font-black text-zinc-900 mb-6 tracking-tight">Set Up Your GD</h3>

              {/* COMPANY SELECTION DROPDOWN */}
              <div className="mb-4 w-full max-w-md flex flex-col items-center gap-2 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
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

              {/* LANGUAGE SELECTION CARD */}
              <div className="mb-8 w-full max-w-md">
                <LanguageSelector
                  value={selectedLanguage}
                  onChange={setSelectedLanguage}
                  variant="card"
                />
              </div>

              <p className="text-zinc-500 mb-10 max-w-lg text-lg leading-relaxed">
                You will enter a 3-person discussion. Your topic is:<br />
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
              className="h-full flex flex-col bg-white rounded-3xl md:rounded-[40px] border border-zinc-200 shadow-sm overflow-hidden"
            >
              {/* Sarvam Error Alert */}
              {sarvamError && (
                <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-800 shrink-0">
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
                <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 animate-pulse shrink-0">
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                  <span>Transcribing your speech with Sarvam AI ({getLanguageOption(selectedLanguage).nativeName})...</span>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-hide">
                {messages.map((msg, i) => (
                  <motion.div
                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i}
                    className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${msg.role === 'user' ? 'bg-emerald-500 text-white border-emerald-400' :
                        msg.role === 'ai1' ? 'bg-indigo-500 text-white border-indigo-400' :
                          'bg-orange-500 text-white border-orange-400'
                      }`}>
                      {msg.role === 'user' ? <User size={18} /> : <BrainCircuit size={18} />}
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-1 ${msg.role === 'user' ? 'text-right text-emerald-600' :
                          msg.role === 'ai1' ? 'text-indigo-600' : 'text-orange-600'
                        }`}>
                        {msg.name}
                      </span>
                      <div className={`p-5 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-[24px] rounded-tr-sm'
                          : msg.role === 'ai1'
                            ? 'bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-[24px] rounded-tl-sm'
                            : 'bg-orange-50 border border-orange-100 text-orange-900 rounded-[24px] rounded-tl-sm'
                        }`}>
                        {msg.text}

                        {/* Multilingual Voice Controls for AI participants */}
                        {msg.role !== 'user' && isIndianLanguage(selectedLanguage) && (
                          <div className="mt-2.5 pt-2 border-t border-zinc-200/50 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => speakGD(msg.text, msg.role === 'ai1' ? 'Priya' : 'Rahul')}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-white hover:bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
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

                {/* DYNAMIC TYPING INDICATOR */}
                {activeTypist !== 'none' && (
                  <div className="flex gap-4 max-w-[80%]">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border text-white ${activeTypist === 'Priya' ? 'bg-indigo-500 border-indigo-400' : 'bg-orange-500 border-orange-400'
                      }`}>
                      <BrainCircuit size={18} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-1 ${activeTypist === 'Priya' ? 'text-indigo-600' : 'text-orange-600'
                        }`}>
                        {activeTypist} is preparing...
                      </span>
                      <div className={`p-5 border rounded-[24px] rounded-tl-sm flex items-center gap-2 ${activeTypist === 'Priya' ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'
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
                    disabled={activeTypist !== 'none' || isBotsTalking || isTranscribing}
                    className={`p-5 rounded-2xl border-2 transition-all flex-shrink-0 disabled:opacity-50 ${isTranscribing
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        : isListening
                          ? 'bg-red-50 border-red-200 text-red-500 animate-pulse shadow-lg shadow-red-500/10'
                          : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:text-emerald-500 hover:border-emerald-200'
                      }`}
                  >
                    {isTranscribing ? (
                      <Loader2 size={24} className="animate-spin text-emerald-600" />
                    ) : isListening ? (
                      <MicOff size={24} />
                    ) : (
                      <Mic size={24} />
                    )}
                  </button>

                  <div className="relative flex-1 group">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={activeTypist !== 'none' || isBotsTalking || isTranscribing}
                      placeholder={
                        isTranscribing ? `Transcribing speech via Sarvam AI (${getLanguageOption(selectedLanguage).nativeName})...` :
                          isBotsTalking ? "Listen to the discussion..." :
                            isListening ? "Listening... (Click mic to stop and transcribe)" :
                              `Add your point in ${getLanguageOption(selectedLanguage).nativeName} or click Mic...`
                      }
                      className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-[24px] px-8 py-5 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-medium pr-20 text-zinc-700 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || activeTypist !== 'none' || isBotsTalking || isTranscribing}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </form>

                <div className="flex justify-center mt-4 gap-6 items-center flex-wrap">
                  <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    <Volume2 size={12} className="text-emerald-500" />
                    {selectedLanguage === 'en' ? 'Auto-Voice Active (Web/Capacitor)' : `Sarvam Voice Active (${getLanguageOption(selectedLanguage).nativeName})`}
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
              className="h-full bg-white rounded-3xl md:rounded-[40px] border border-zinc-200 shadow-sm p-6 md:p-12 overflow-y-auto flex flex-col items-center text-center"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:p-8 w-full max-w-4xl">
                <div className="bg-zinc-50 p-6 md:p-10 rounded-3xl md:rounded-[40px] border border-zinc-100 flex flex-col items-center justify-center">
                  <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Overall Score</p>
                  <div className="relative">
                    <span className="text-7xl font-black text-emerald-500">{evaluation.score}</span>
                    <span className="text-2xl text-zinc-300 font-bold ml-1">/100</span>
                  </div>
                </div>

                <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[40px] border border-zinc-200 shadow-sm text-left relative overflow-hidden">
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
