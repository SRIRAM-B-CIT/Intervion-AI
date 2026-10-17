import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'student' | 'admin' | null;

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (role: UserRole, name: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (role, name) => set({ 
        user: { 
          id: Math.random().toString(36).substr(2, 9), 
          name, 
          email: `${name.toLowerCase().replace(' ', '.')}@example.com`, 
          role 
        }, 
        isAuthenticated: true 
      }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export interface Company {
  id: string;
  name: string;
  logo: string;
  description: string;
}

export interface TestSession {
  sessionId: string;
  companyId: string;
  currentRoundIndex: number;
  isRoundSubmitted: boolean;
  isFeedbackViewed: boolean;
  warnings: number;
  isTerminated: boolean;
  scores: Record<string, number>;
  roundFeedback: string | null;
}

export interface PerformanceRecord {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  companyId: string;
  roundIndex: number;
  score: number;
  feedback: string;
  completedAt: string;
}

export type HRGender = 'male' | 'female';
export type HRTone = 'professional' | 'friendly' | 'strict';

export interface ResumeAnalysis {
  atsScore: number;
  summary: string;
  topSkills: string[];
  missingKeywords: string[];
  formattingScore: number;
  actionItems: string[];
}

interface AppState {
  selectedCompanyId: string | null;
  currentSession: TestSession | null;
  hrGender: HRGender;
  hrTone: HRTone;
  resumeAnalysis: ResumeAnalysis | null;
  performanceHistory: PerformanceRecord[];
  selectCompany: (companyId: string) => void;
  startSession: (companyId: string) => void;
  updateSession: (updates: Partial<TestSession>) => void;
  addWarning: () => void;
  submitRound: (score: number, feedback: string) => void;
  viewFeedback: () => void;
  nextRound: () => void;
  resetSession: () => void;
  setHRSettings: (gender: HRGender, tone: HRTone) => void;
  setResumeAnalysis: (analysis: ResumeAnalysis) => void;
}

export const DEFAULT_MOCK_PERFORMANCE_HISTORY: PerformanceRecord[] = [
  {
    id: "mock-sess-1:0",
    sessionId: "mock-sess-1",
    userId: "test-student-4",
    userName: "Elena Rostova",
    companyId: "1",
    roundIndex: 0,
    score: 96,
    feedback: "Exceptional ATS compatibility and strong structural layout. Relevant keywords matched well.",
    completedAt: "2026-10-04T10:15:00.000Z",
  },
  {
    id: "mock-sess-1:1",
    sessionId: "mock-sess-1",
    userId: "test-student-4",
    userName: "Elena Rostova",
    companyId: "1",
    roundIndex: 1,
    score: 94,
    feedback: "High quantitative precision and rapid logical deduction. Answered all questions accurately.",
    completedAt: "2026-10-04T10:45:00.000Z",
  },
  {
    id: "mock-sess-1:2",
    sessionId: "mock-sess-1",
    userId: "test-student-4",
    userName: "Elena Rostova",
    companyId: "1",
    roundIndex: 2,
    score: 98,
    feedback: "Optimal O(N) algorithmic efficiency with modular clean code style. Passed all test suites.",
    completedAt: "2026-10-04T11:45:00.000Z",
  },
  {
    id: "mock-sess-1:3",
    sessionId: "mock-sess-1",
    userId: "test-student-4",
    userName: "Elena Rostova",
    companyId: "1",
    roundIndex: 3,
    score: 92,
    feedback: "Constructive collaboration, active listening, and articulated core architectural arguments persuasively.",
    completedAt: "2026-10-04T12:05:00.000Z",
  },
  {
    id: "mock-sess-1:4",
    sessionId: "mock-sess-1",
    userId: "test-student-4",
    userName: "Elena Rostova",
    companyId: "1",
    roundIndex: 4,
    score: 95,
    feedback: "Exemplary behavioral alignment, high posture confidence score, and concise structured answers.",
    completedAt: "2026-10-04T12:30:00.000Z",
  },
  {
    id: "mock-sess-0:0",
    sessionId: "mock-sess-0",
    userId: "test-student-4",
    userName: "Elena Rostova",
    companyId: "2",
    roundIndex: 0,
    score: 88,
    feedback: "Good initial resume structure with strong fundamentals.",
    completedAt: "2026-10-01T09:00:00.000Z",
  },
  {
    id: "mock-sess-0:1",
    sessionId: "mock-sess-0",
    userId: "test-student-4",
    userName: "Elena Rostova",
    companyId: "2",
    roundIndex: 1,
    score: 85,
    feedback: "Solid performance on mathematical reasoning and analogies.",
    completedAt: "2026-10-01T09:30:00.000Z",
  },
  {
    id: "mock-sess-0:2",
    sessionId: "mock-sess-0",
    userId: "test-student-4",
    userName: "Elena Rostova",
    companyId: "2",
    roundIndex: 2,
    score: 90,
    feedback: "Clean coding solution passing all test cases.",
    completedAt: "2026-10-01T10:15:00.000Z",
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedCompanyId: null,
      currentSession: null,
      hrGender: 'female',
      hrTone: 'professional',
      resumeAnalysis: null,
      performanceHistory: DEFAULT_MOCK_PERFORMANCE_HISTORY,
      
      selectCompany: (companyId) => set({ selectedCompanyId: companyId }),
      
      startSession: (companyId) => set({ 
        currentSession: { 
          sessionId: crypto.randomUUID(),
          companyId, 
          currentRoundIndex: 0,
          isRoundSubmitted: false,
          isFeedbackViewed: false,
          warnings: 0,
          isTerminated: false,
          scores: {},
          roundFeedback: null
        } 
      }),
      
      updateSession: (updates) => set((state) => ({
        currentSession: state.currentSession ? { ...state.currentSession, ...updates } : null
      })),

      addWarning: () => set((state) => {
        if (!state.currentSession) return state;
        const newWarnings = state.currentSession.warnings + 1;
        return {
          currentSession: {
            ...state.currentSession,
            warnings: newWarnings,
            isTerminated: newWarnings >= 3
          }
        };
      }),

      submitRound: (score, feedback) => set((state) => {
        if (!state.currentSession) return state;
        const user = useAuthStore.getState().user;
        const sessionId = state.currentSession.sessionId || crypto.randomUUID();
        const recordId = `${sessionId}:${state.currentSession.currentRoundIndex}`;
        const record: PerformanceRecord = {
          id: recordId,
          sessionId,
          userId: user?.id || "local-guest",
          userName: user?.name || "Guest",
          companyId: state.currentSession.companyId,
          roundIndex: state.currentSession.currentRoundIndex,
          score: Math.max(0, Math.min(100, Math.round(score))),
          feedback,
          completedAt: new Date().toISOString(),
        };
        return {
          currentSession: {
            ...state.currentSession,
            sessionId,
            isRoundSubmitted: true,
            isFeedbackViewed: false,
            roundFeedback: feedback,
            scores: {
              ...state.currentSession.scores,
              [state.currentSession.currentRoundIndex]: score
            }
          },
          performanceHistory: [
            ...state.performanceHistory.filter((item) => item.id !== recordId),
            record,
          ].slice(-500),
        };
      }),

      viewFeedback: () => set((state) => ({
        currentSession: state.currentSession ? { ...state.currentSession, isFeedbackViewed: true } : null
      })),

      nextRound: () => set((state) => {
        if (!state.currentSession) return state;
        return {
          currentSession: {
            ...state.currentSession,
            currentRoundIndex: state.currentSession.currentRoundIndex + 1,
            isRoundSubmitted: false,
            isFeedbackViewed: false,
            roundFeedback: null
          }
        };
      }),

      resetSession: () => set({ currentSession: null, selectedCompanyId: null, resumeAnalysis: null }),
      
      setHRSettings: (gender, tone) => set({ hrGender: gender, hrTone: tone }),
      
      setResumeAnalysis: (analysis) => set({ resumeAnalysis: analysis }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

