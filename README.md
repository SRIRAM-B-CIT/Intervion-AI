# InterviewPrep

InterviewPrep is a Vite + React + TypeScript interview preparation platform with separate student and admin experiences. Students can move through multi-round mock interview workflows, while admins can manage company workflows, question banks, and review analytics.

The current implementation is frontend-heavy and uses local persisted state for authentication and session progress, with Supabase used for parts of the CMS data flow.

## Features

- Student dashboard with mock performance visualizations
- Multi-round mock interview marathon by company
- Resume analysis with AI-generated ATS feedback
- Aptitude test round with timing, scoring, and review
- Coding lab round for company-specific coding questions
- HR interview simulation
- Group discussion simulation with voice input and AI participants
- Admin analytics dashboard
- Admin CMS for company workflows, aptitude CSV import, and coding question management

## Student Flow

Students sign in through a demo auth screen, choose a target company, and progress through the configured rounds for that company. Supported round types are:

- `resume`
- `aptitude`
- `coding`
- `gd`
- `hr`

Round order and configuration are driven from the CMS store in [src/store/useCmsStore.ts](src/store/useCmsStore.ts).

## Admin Flow

Admins can:

- Review candidate analytics from the admin dashboard
- Manage companies and interview workflows
- Upload aptitude questions from CSV
- Manage coding questions per company
- Configure HR interview tone and persona settings

The current admin analytics view uses mock student data, while parts of the CMS read and write aptitude and coding data through Supabase.

## Tech Stack

- React 19
- TypeScript
- Vite 6
- React Router 7
- Zustand for persisted client-side state
- Framer Motion / Motion for animations
- Recharts for analytics visualizations
- Supabase for aptitude and coding question storage
- Gemini and Groq-based AI integrations for resume, HR, and discussion features

## Project Structure

```text
src/
  components/
    DashboardLayout.tsx
  lib/
    supabase.ts
  pages/
    AdminAnalytics.tsx
    AdminCMS.tsx
    AptitudeTest.tsx
    CodingLab.tsx
    GroupDiscussion.tsx
    HRInterview.tsx
    LoginPage.tsx
    MockMarathon.tsx
    ResumeAnalyzer.tsx
    StudentDashboard.tsx
  services/
    geminiService.ts
  store/
    useCmsStore.ts
    useStore.ts
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase project if you want CMS-backed aptitude and coding data
- AI provider credentials for Gemini and Groq-backed features

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root.

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_shared_gemini_api_key
VITE_GEMINI_API_KEY_CODING=your_coding_lab_gemini_api_key
VITE_GEMINI_API_KEY_HR=your_hr_interview_gemini_api_key
VITE_GROQ_API_KEY_HR=your_hr_interview_groq_api_key
VITE_GROQ_API_KEY_GD=your_group_discussion_groq_api_key
VITE_JDOODLE_CLIENT_ID=your_jdoodle_client_id
VITE_JDOODLE_CLIENT_SECRET=your_jdoodle_client_secret
```

Notes:

- Copy from [.env.example](.env.example) when setting up a new environment.
- [src/lib/supabase.ts](src/lib/supabase.ts) expects `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- [src/services/geminiService.ts](src/services/geminiService.ts) reads `VITE_GEMINI_API_KEY`.
- [src/pages/CodingLab.tsx](src/pages/CodingLab.tsx) reads `VITE_GEMINI_API_KEY_CODING`, `VITE_JDOODLE_CLIENT_ID`, and `VITE_JDOODLE_CLIENT_SECRET`.
- [src/pages/HRInterview.tsx](src/pages/HRInterview.tsx) reads `VITE_GEMINI_API_KEY_HR` and `VITE_GROQ_API_KEY_HR`.
- [src/pages/GroupDiscussion.tsx](src/pages/GroupDiscussion.tsx) reads `VITE_GROQ_API_KEY_GD`.
- The app requests camera and microphone access per [metadata.json](metadata.json).
- Vite only exposes variables prefixed with `VITE_` to browser code.
- These values are still delivered to the browser at runtime. For production, move Gemini, Groq, and JDoodle calls behind a backend or serverless proxy if the credentials must remain secret.

### Run Locally

```bash
npm run dev
```

Open the local Vite URL shown in the terminal.

## Available Scripts

- `npm run dev` starts the Vite development server
- `npm run build` creates a production build
- `npm run preview` previews the production build locally
- `npm run lint` runs `tsc --noEmit`

## Routing

### Public

- `/login`

### Student Routes

- `/dashboard`
- `/mock-marathon`
- `/resume`
- `/aptitude`
- `/coding`
- `/group-discussion`
- `/hr`

### Admin Routes

- `/admin`
- `/admin/students`
- `/admin/cms`

Route protection is handled in [src/App.tsx](src/App.tsx) using the persisted auth store in [src/store/useStore.ts](src/store/useStore.ts).

## Data Model Notes

- Authentication is currently demo-only and persisted in `localStorage`
- Student session progress is stored in Zustand persistence
- Company workflows are seeded client-side in the CMS store
- Aptitude and coding data can be loaded from Supabase in the admin CMS

## Supabase Expectations

The current admin CMS expects tables similar to:

- `aptitude_questions`
- `coding_questions`

If those tables are missing, the CMS import and fetch flows will not work as intended.

## Current Limitations

- Login and signup are mock flows and do not validate against a real backend
- Some dashboards and analytics use placeholder data
- AI and compiler credentials are client-side Vite variables, so they are not suitable for true secret storage in production
- The `clean` script in `package.json` uses a Unix-style command and may need adjustment on Windows

## Recommended Next Steps

1. Proxy Gemini, Groq, and JDoodle requests through a backend if you need real secret management.
2. Add a real authentication backend for student and admin access.
3. Document the exact Supabase schema used by the CMS.
4. Add automated tests for routing, stores, and round progression.
