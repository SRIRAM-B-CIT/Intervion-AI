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
  companyId: string;
  currentRoundIndex: number;
  isRoundSubmitted: boolean;
  isFeedbackViewed: boolean;
  warnings: number;
  isTerminated: boolean;
  scores: Record<string, number>;
  roundFeedback: string | null;
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

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedCompanyId: null,
      currentSession: null,
      hrGender: 'female',
      hrTone: 'professional',
      resumeAnalysis: null,
      
      selectCompany: (companyId) => set({ selectedCompanyId: companyId }),
      
      startSession: (companyId) => set({ 
        currentSession: { 
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
        return {
          currentSession: {
            ...state.currentSession,
            isRoundSubmitted: true,
            isFeedbackViewed: false,
            roundFeedback: feedback,
            scores: {
              ...state.currentSession.scores,
              [state.currentSession.currentRoundIndex]: score
            }
          }
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

