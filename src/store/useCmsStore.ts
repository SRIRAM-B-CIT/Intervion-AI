import { create } from 'zustand';

export type RoundType = 'resume' | 'aptitude' | 'coding' | 'hr' | 'gd';

export interface InterviewRound {
  id: string;
  type: RoundType;
  duration: number; // in minutes
  cutoff?: number; // percentage
  config?: {
    topics?: string[];
    questionCount?: number;
  };
}

export interface AptitudeQuestion {
  id: string;
  qn: string;
  question: string;
  options: string[];
  answer: string;
  topic: string;
}

export interface CodingQuestion {
  id: string;
  companyId: string;
  title: string;
  problemStatement: string;
  boilerplate: string;
}

export interface Company {
  id: string;
  name: string;
  logo: string;
  description: string;
  targetRole: string;
  workflow: InterviewRound[];
}

interface CmsState {
  companies: Company[];
  globalAptitudeBank: AptitudeQuestion[];
  codingBank: CodingQuestion[];
  addCompany: (company: Omit<Company, 'id'>) => void;
  updateCompany: (id: string, company: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  setGlobalAptitudeBank: (questions: AptitudeQuestion[]) => void;
  addCodingQuestion: (question: Omit<CodingQuestion, 'id'>) => void;
  deleteCodingQuestion: (id: string) => void;
}

export const useCmsStore = create<CmsState>((set) => ({
  companies: [
    { 
      id: '1', 
      name: 'Google', 
      logo: 'https://logo.clearbit.com/google.com', 
      description: 'Search and Cloud computing leader.', 
      targetRole: 'Frontend Architect',
      workflow: [
        { id: 'r1', type: 'resume', duration: 5 },
        { id: 'r2', type: 'aptitude', duration: 30, cutoff: 70, config: { topics: ['Logical Reasoning'], questionCount: 10 } },
        { id: 'r3', type: 'coding', duration: 60, cutoff: 60, config: { questionCount: 2 } },
        { id: 'r4', type: 'hr', duration: 20 }
      ]
    },
    { 
      id: '2', 
      name: 'Microsoft', 
      logo: 'https://logo.clearbit.com/microsoft.com', 
      description: 'Software, services, and hardware giant.', 
      targetRole: 'Fullstack Engineer',
      workflow: [
        { id: 'r5', type: 'aptitude', duration: 45, cutoff: 75, config: { topics: ['Quant'], questionCount: 15 } },
        { id: 'r6', type: 'coding', duration: 90, cutoff: 70, config: { questionCount: 3 } }
      ]
    },
  ],
  globalAptitudeBank: [],
  codingBank: [
    { 
      id: 'c1', 
      companyId: '1', 
      title: 'Two Sum', 
      problemStatement: 'Find two numbers that add up to target.', 
      boilerplate: 'function twoSum(nums, target) {\n  // your code here\n}' 
    }
  ],
  addCompany: (company) => set((state) => ({
    companies: [...state.companies, { ...company, id: Math.random().toString(36).substr(2, 9) }]
  })),
  updateCompany: (id, company) => set((state) => ({
    companies: state.companies.map((c) => (c.id === id ? { ...c, ...company } : c))
  })),
  deleteCompany: (id) => set((state) => ({
    companies: state.companies.filter((c) => c.id !== id),
    codingBank: state.codingBank.filter((q) => q.companyId !== id)
  })),
  setGlobalAptitudeBank: (questions) => set({ globalAptitudeBank: questions }),
  addCodingQuestion: (question) => set((state) => ({
    codingBank: [...state.codingBank, { ...question, id: Math.random().toString(36).substr(2, 9) }]
  })),
  deleteCodingQuestion: (id) => set((state) => ({
    codingBank: state.codingBank.filter((q) => q.id !== id)
  })),
}));
