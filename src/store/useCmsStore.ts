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
    topic?: string; // <-- ADDED THIS FOR GROUP DISCUSSION
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
      id: "1",
      name: "Google",
      logo: "https://images.seeklogo.com/logo-png/62/2/google-new-logo-png_seeklogo-622426.png",
      description: "Search and Cloud computing leader.",
      targetRole: "Frontend Architect",
      workflow: [
        { id: "r1", type: "resume", duration: 5 },
        {
          id: "r2",
          type: "aptitude",
          duration: 30,
          cutoff: 70,
          config: { topics: ["Logical Reasoning"], questionCount: 10 },
        },
        {
          id: "r3",
          type: "coding",
          duration: 60,
          cutoff: 60,
          config: { questionCount: 2 },
        },
        {
          id: "r4",
          type: "gd",
          duration: 20,
          config: { topic: "AI will replace Frontend Architects in 5 years." },
        }, // Added a demo GD round
        { id: "r5", type: "hr", duration: 20 },
      ],
    },
    {
      id: "2",
      name: "Microsoft",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/1024px-Microsoft_logo.svg.png",
      description: "Software, services, and hardware giant.",
      targetRole: "Fullstack Engineer",
      workflow: [
        {
          id: "r6",
          type: "aptitude",
          duration: 45,
          cutoff: 75,
          config: { topics: ["Quant"], questionCount: 15 },
        },
        {
          id: "r7",
          type: "coding",
          duration: 90,
          cutoff: 70,
          config: { questionCount: 3 },
        },
      ],
    },
    {
      id: "3",
      name: "Amazon",
      logo: "https://toppng.com/uploads/preview/amazon-logo-vector-1157394522189k5iof9l3.png",
      description: "Global e-commerce and cloud computing giant.",
      targetRole: "Frontend Architect",
      workflow: [
        { id: "r1", type: "resume", duration: 5 },
        {
          id: "r2",
          type: "aptitude",
          duration: 30,
          cutoff: 70,
          config: { topics: ["Logical Reasoning"], questionCount: 10 },
        },
        {
          id: "r3",
          type: "coding",
          duration: 60,
          cutoff: 60,
          config: { questionCount: 2 },
        },
        {
          id: "r4",
          type: "gd",
          duration: 20,
          config: {
            topic:
              "Microservices architecture is better than monolithic systems for large-scale platforms.",
          },
        },
        { id: "r5", type: "hr", duration: 20 },
      ],
    },

    {
      id: "4",
      name: "Netflix",
      logo: "https://tse1.explicit.bing.net/th/id/OIP.AVu3t2-rFhHvoVcvkA38kQHaEK?rs=1&pid=ImgDetMain&o=7&rm=3",
      description: "Streaming platform and entertainment technology leader.",
      targetRole: "Frontend Architect",
      workflow: [
        { id: "r1", type: "resume", duration: 5 },
        {
          id: "r2",
          type: "aptitude",
          duration: 30,
          cutoff: 70,
          config: { topics: ["Logical Reasoning"], questionCount: 10 },
        },
        {
          id: "r3",
          type: "coding",
          duration: 60,
          cutoff: 60,
          config: { questionCount: 2 },
        },
        {
          id: "r4",
          type: "gd",
          duration: 20,
          config: {
            topic:
              "Client-side rendering vs Server-side rendering for high-performance streaming apps.",
          },
        },
        { id: "r5", type: "hr", duration: 20 },
      ],
    },

    {
      id: "5",
      name: "Stripe",
      logo: "https://th.bing.com/th/id/OIP.2Wn_QwGm8-Pw09teA3tg9gHaEK?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3",
      description:
        "Fintech company providing online payment processing solutions.",
      targetRole: "Frontend Architect",
      workflow: [
        { id: "r1", type: "resume", duration: 5 },
        {
          id: "r2",
          type: "aptitude",
          duration: 30,
          cutoff: 70,
          config: { topics: ["Logical Reasoning"], questionCount: 10 },
        },
        {
          id: "r3",
          type: "coding",
          duration: 60,
          cutoff: 60,
          config: { questionCount: 2 },
        },
        {
          id: "r4",
          type: "gd",
          duration: 20,
          config: {
            topic:
              "Security vs User Experience: What matters more in fintech frontend applications?",
          },
        },
        { id: "r5", type: "hr", duration: 20 },
      ],
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