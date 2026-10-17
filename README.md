# Intervion AI 🎙️💼

> **Your personal AI interview studio.** Practice real-time HR interviews, multi-agent group discussions, coding challenges, and aptitude tests — in English or your native Indian language.

🌐 **Live Demo:** [intervion-ai.vercel.app](https://intervion-ai.vercel.app/)

---

## What is Intervion AI?

Getting ready for campus placements or company interviews can be stressful. We built **Intervion AI** to simulate real interview rooms with intelligent, interactive AI companions so you can build confidence before the real deal.

Designed with an **Espresso & Terracotta light glassmorphic** theme, the interface gives you the calm, focused feeling of a professional interview studio.

---

## Key Features

- 🎯 **HR Mock Interview Studio**: Interactive AI interviewer with real-time MediaPipe facial & posture tracking, voice synthesis, and detailed performance scorecards.
- 👥 **Group Discussion (GD) Room**: Join a lively debate with autonomous AI participants (Priya & Rahul) that take turns, counter your points, and evaluate your leadership.
- 🗣️ **Multilingual Voice Support**: Practice in your preferred language — full speech recognition and natural voice synthesis in **English, Hindi, Tamil, Telugu, and Malayalam** powered by Sarvam AI.
- 📄 **ATS Resume Screening**: Upload your resume to get instant keyword match scores, formatting checks, and actionable tips.
- 💻 **Coding Lab & Aptitude Tests**: Timed coding challenges with automated test judges and categorized aptitude problem banks.
- 🏢 **Company Mock Marathon**: Step through end-to-end recruitment pipelines for top tech firms.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Recharts
- **Vision & Audio**: MediaPipe FaceLandmarker, Sarvam AI (STT & TTS), Web Speech API
- **AI & Evaluation**: Groq (Qwen & LLaMA models), Google Gemini
- **Database**: Supabase
- **Deployment**: Vercel (with Serverless API proxies)

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/SRIRAM-B-CIT/Intervion-AI.git
cd Intervion-AI
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your keys:

```bash
cp .env.example .env
```

```env
# Required for database & auth
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"

# AI engine for interview generation & evaluation
GROQ_API_KEY="your-groq-key"

# Optional: Indian language voice support
SARVAM_API_KEY="your-sarvam-key"
```

### 3. Run Locally

```bash
npm run server
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## License

Created with ❤️ by Sriram.
