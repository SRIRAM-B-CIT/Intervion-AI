import React, { useState, useRef } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Brain, 
  Code, 
  MessageSquare,
  ChevronRight,
  Upload,
  X,
  Save,
  Layout,
  CheckCircle2,
  FileText,
  Users,
  Settings,
  Clock,
  Target,
  GripVertical
} from 'lucide-react';
import { useCmsStore, Company, InterviewRound, RoundType, AptitudeQuestion, CodingQuestion } from '../store/useCmsStore';
import { useAppStore } from '../store/useStore';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import Papa from 'papaparse';

export default function AdminCMS() {
  const { 
    companies, 
    globalAptitudeBank, 
    codingBank,
    addCompany, 
    updateCompany, 
    deleteCompany, 
    setGlobalAptitudeBank,
    addCodingQuestion,
    deleteCodingQuestion
  } = useCmsStore();
  
  const { hrGender, hrTone, setHRSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<'companies' | 'aptitude' | 'settings'>('companies');
  
  const [isEditingCompany, setIsEditingCompany] = useState<string | null>(null);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState<Omit<Company, 'id'>>({
    name: '',
    description: '',
    logo: 'https://logo.clearbit.com/placeholder.com',
    targetRole: '',
    workflow: []
  });

  const [isAddingCoding, setIsAddingCoding] = useState(false);
  const [codingForm, setCodingForm] = useState<Omit<CodingQuestion, 'id'>>({
    companyId: '',
    title: '',
    problemStatement: '',
    boilerplate: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedQuestions: AptitudeQuestion[] = results.data.map((row: any, index: number) => ({
            id: `apt-${index}`,
            qn: row['Q.N'] || index.toString(),
            question: row['QUESTION'] || '',
            options: [row['OPTION A'], row['OPTION B'], row['OPTION C'], row['OPTION D']].filter(Boolean),
            answer: row['ANSWER'] || '',
            topic: row['TOPIC'] || 'General'
          }));
          setGlobalAptitudeBank(parsedQuestions);
          alert(`Successfully imported ${parsedQuestions.length} questions!`);
        },
        error: (error) => {
          console.error('CSV Parsing Error:', error);
          alert('Error parsing CSV. Please check the format.');
        }
      });
    }
  };

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingCompany) {
      updateCompany(isEditingCompany, companyForm);
      setIsEditingCompany(null);
    } else {
      addCompany(companyForm);
      setIsAddingCompany(false);
    }
    setCompanyForm({ name: '', description: '', logo: 'https://logo.clearbit.com/placeholder.com', targetRole: '', workflow: [] });
  };

  const addRound = () => {
    const newRound: InterviewRound = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'aptitude',
      duration: 30,
      cutoff: 70,
      config: { topics: [], questionCount: 10 }
    };
    setCompanyForm({ ...companyForm, workflow: [...companyForm.workflow, newRound] });
  };

  const removeRound = (id: string) => {
    setCompanyForm({ ...companyForm, workflow: companyForm.workflow.filter(r => r.id !== id) });
  };

  const updateRound = (id: string, updates: Partial<InterviewRound>) => {
    setCompanyForm({
      ...companyForm,
      workflow: companyForm.workflow.map(r => r.id === id ? { ...r, ...updates } : r)
    });
  };

  const openEditCompany = (company: Company) => {
    setCompanyForm({ ...company });
    setIsEditingCompany(company.id);
  };

  const handleCodingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCodingQuestion(codingForm);
    setIsAddingCoding(false);
    setCodingForm({ companyId: '', title: '', problemStatement: '', boilerplate: '' });
  };

  const availableTopics = Array.from(new Set(globalAptitudeBank.map(q => q.topic)));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Content Management</h1>
          <p className="text-zinc-500 mt-1">Manage companies, workflows, and global question banks.</p>
        </div>
        {activeTab === 'companies' && !isAddingCompany && !isEditingCompany && (
          <button 
            onClick={() => setIsAddingCompany(true)}
            className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Company
          </button>
        )}
        {activeTab === 'aptitude' && (
          <div className="flex gap-3">
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleCsvUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Import Aptitude CSV
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-zinc-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('companies')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'companies' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Companies & Workflows
        </button>
        <button
          onClick={() => setActiveTab('aptitude')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'aptitude' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Global Aptitude Bank
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'settings' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Interview Settings
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'companies' && (
          <motion.div 
            key="companies-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {(isAddingCompany || isEditingCompany) ? (
              <div className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-zinc-900">{isEditingCompany ? 'Edit Company Workflow' : 'Create New Company'}</h3>
                  <button onClick={() => { setIsAddingCompany(false); setIsEditingCompany(null); }} className="p-2 hover:bg-zinc-100 rounded-full">
                    <X className="w-6 h-6 text-zinc-400" />
                  </button>
                </div>
                
                <form onSubmit={handleCompanySubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-700">Company Name</label>
                        <input 
                          required
                          type="text" 
                          value={companyForm.name}
                          onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-700">Target Role</label>
                        <input 
                          required
                          type="text" 
                          value={companyForm.targetRole}
                          onChange={(e) => setCompanyForm({...companyForm, targetRole: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Description</label>
                      <textarea 
                        required
                        value={companyForm.description}
                        onChange={(e) => setCompanyForm({...companyForm, description: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all h-[124px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                        <Layout className="w-5 h-5 text-emerald-500" />
                        Interview Sequence Builder
                      </h4>
                      <button 
                        type="button"
                        onClick={addRound}
                        className="text-emerald-600 text-sm font-bold hover:text-emerald-700 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Round
                      </button>
                    </div>

                    <Reorder.Group 
                      axis="y" 
                      values={companyForm.workflow} 
                      onReorder={(newWorkflow) => setCompanyForm({ ...companyForm, workflow: newWorkflow })}
                      className="space-y-4"
                    >
                      {companyForm.workflow.map((round) => (
                        <Reorder.Item 
                          key={round.id} 
                          value={round}
                          className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 flex flex-col gap-4 relative group"
                        >
                          <div className="flex items-center gap-4">
                            <GripVertical className="w-5 h-5 text-zinc-300 cursor-grab active:cursor-grabbing" />
                            <select 
                              value={round.type}
                              onChange={(e) => updateRound(round.id, { type: e.target.value as RoundType })}
                              className="bg-white px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-bold"
                            >
                              <option value="resume">Resume Analysis</option>
                              <option value="aptitude">Aptitude Test</option>
                              <option value="coding">Coding Lab</option>
                              <option value="hr">HR Interview</option>
                              <option value="gd">Group Discussion</option>
                            </select>
                            
                            <div className="flex items-center gap-2 ml-auto">
                              <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-zinc-200">
                                <Clock className="w-4 h-4 text-zinc-400" />
                                <input 
                                  type="number" 
                                  value={round.duration}
                                  onChange={(e) => updateRound(round.id, { duration: parseInt(e.target.value) })}
                                  className="w-12 text-sm font-bold focus:outline-none"
                                />
                                <span className="text-xs text-zinc-400 font-bold">MIN</span>
                              </div>
                              {(round.type === 'aptitude' || round.type === 'coding') && (
                                <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-zinc-200">
                                  <Target className="w-4 h-4 text-zinc-400" />
                                  <input 
                                    type="number" 
                                    value={round.cutoff}
                                    onChange={(e) => updateRound(round.id, { cutoff: parseInt(e.target.value) })}
                                    className="w-12 text-sm font-bold focus:outline-none"
                                  />
                                  <span className="text-xs text-zinc-400 font-bold">% CUTOFF</span>
                                </div>
                              )}
                              <button 
                                type="button"
                                onClick={() => removeRound(round.id)}
                                className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {round.type === 'aptitude' && (
                            <div className="grid grid-cols-2 gap-4 pl-9">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Select Topics</label>
                                <div className="flex flex-wrap gap-2">
                                  {availableTopics.map(topic => (
                                    <button
                                      key={topic}
                                      type="button"
                                      onClick={() => {
                                        const currentTopics = round.config?.topics || [];
                                        const newTopics = currentTopics.includes(topic)
                                          ? currentTopics.filter(t => t !== topic)
                                          : [...currentTopics, topic];
                                        updateRound(round.id, { config: { ...round.config, topics: newTopics } });
                                      }}
                                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                                        round.config?.topics?.includes(topic)
                                          ? 'bg-emerald-500 border-emerald-500 text-white'
                                          : 'bg-white border-zinc-200 text-zinc-500 hover:border-emerald-500'
                                      }`}
                                    >
                                      {topic}
                                    </button>
                                  ))}
                                  {availableTopics.length === 0 && <p className="text-xs text-zinc-400 italic">No topics available. Import Aptitude CSV first.</p>}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Question Count</label>
                                <input 
                                  type="number" 
                                  value={round.config?.questionCount}
                                  onChange={(e) => updateRound(round.id, { config: { ...round.config, questionCount: parseInt(e.target.value) } })}
                                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-bold"
                                />
                              </div>
                            </div>
                          )}

                          {round.type === 'coding' && (
                            <div className="pl-9">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Number of Questions to Face</label>
                                <input 
                                  type="number" 
                                  value={round.config?.questionCount}
                                  onChange={(e) => updateRound(round.id, { config: { ...round.config, questionCount: parseInt(e.target.value) } })}
                                  className="w-32 px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-bold"
                                />
                                <p className="text-[10px] text-zinc-400">Pulled randomly from company's private coding bank.</p>
                              </div>
                            </div>
                          )}
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                    
                    {companyForm.workflow.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-zinc-200 rounded-2xl">
                        <Layout className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                        <p className="text-zinc-400 font-medium">No rounds added yet. Build your interview sequence.</p>
                      </div>
                    )}
                  </div>

                  <button type="submit" className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                    <Save className="w-6 h-6" />
                    {isEditingCompany ? 'Update Company & Workflow' : 'Create Company'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companies.map((company) => (
                  <motion.div 
                    key={company.id}
                    whileHover={{ y: -4 }}
                    className="bg-white p-6 rounded-[32px] border border-zinc-200 shadow-sm group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-50 p-3">
                        <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEditCompany(company)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-900">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteCompany(company.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-zinc-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-1">{company.name}</h3>
                    <p className="text-xs font-bold text-emerald-600 mb-2 uppercase tracking-wider">{company.targetRole}</p>
                    <p className="text-sm text-zinc-500 mb-6 line-clamp-2">{company.description}</p>
                    
                    <div className="pt-6 border-t border-zinc-100">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {company.workflow.map(round => (
                          <span key={round.id} className="px-2 py-1 bg-zinc-100 rounded-lg text-[10px] font-bold text-zinc-500 uppercase">
                            {round.type}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          {codingBank.filter(q => q.companyId === company.id).length} Coding Problems
                        </span>
                        <button 
                          onClick={() => {
                            setCodingForm({ ...codingForm, companyId: company.id });
                            setIsAddingCoding(true);
                          }}
                          className="text-emerald-600 text-xs font-bold hover:underline"
                        >
                          Manage Coding Bank
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'aptitude' && (
          <motion.div 
            key="aptitude-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-[32px] border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Search global bank..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-zinc-500">{globalAptitudeBank.length} Questions Loaded</span>
                </div>
              </div>
              <div className="divide-y divide-zinc-100 max-h-[600px] overflow-y-auto">
                {globalAptitudeBank.map((q) => (
                  <div key={q.id} className="p-6 hover:bg-zinc-50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                        {q.topic[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 line-clamp-1">{q.question}</h4>
                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                          {q.topic} • {q.options.length} Options
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-bold text-zinc-500 uppercase">
                        Ans: {q.answer}
                      </span>
                    </div>
                  </div>
                ))}
                {globalAptitudeBank.length === 0 && (
                  <div className="py-20 text-center">
                    <FileText className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                    <p className="text-zinc-400 font-medium">Global bank is empty. Upload a CSV to get started.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div 
            key="settings-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-sm max-w-2xl"
          >
            <h3 className="text-xl font-bold text-zinc-900 mb-6">HR Interview Configuration</h3>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-sm font-bold text-zinc-700 uppercase tracking-wider">Interviewer Gender</label>
                <div className="flex gap-4">
                  {(['male', 'female'] as const).map((gender) => (
                    <button
                      key={gender}
                      onClick={() => setHRSettings(gender, hrTone)}
                      className={`flex-1 py-4 rounded-2xl border-2 transition-all font-bold capitalize ${
                        hrGender === gender 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                          : 'border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-zinc-200'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-zinc-700 uppercase tracking-wider">Interviewer Tone</label>
                <div className="grid grid-cols-3 gap-4">
                  {(['professional', 'friendly', 'strict'] as const).map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setHRSettings(hrGender, tone)}
                      className={`py-4 rounded-2xl border-2 transition-all font-bold capitalize ${
                        hrTone === tone 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                          : 'border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-zinc-200'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  <span className="font-bold text-zinc-700">Note:</span> These settings will apply to all students taking the HR Interview round. The AI will adjust its persona and visual representation based on these selections.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coding Bank Modal */}
      <AnimatePresence>
        {isAddingCoding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingCoding(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-zinc-900">Coding Bank: {companies.find(c => c.id === codingForm.companyId)?.name}</h3>
                <button onClick={() => setIsAddingCoding(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <form onSubmit={handleCodingSubmit} className="space-y-4 bg-zinc-50 p-6 rounded-3xl border border-zinc-200">
                  <h4 className="font-bold text-zinc-900">Add New Problem</h4>
                  <div className="space-y-4">
                    <input 
                      required
                      placeholder="Problem Title"
                      value={codingForm.title}
                      onChange={(e) => setCodingForm({ ...codingForm, title: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200"
                    />
                    <textarea 
                      required
                      placeholder="Problem Statement"
                      value={codingForm.problemStatement}
                      onChange={(e) => setCodingForm({ ...codingForm, problemStatement: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 h-24"
                    />
                    <textarea 
                      required
                      placeholder="Boilerplate Code"
                      value={codingForm.boilerplate}
                      onChange={(e) => setCodingForm({ ...codingForm, boilerplate: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 h-32 font-mono text-sm"
                    />
                    <button type="submit" className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all">
                      Add to Bank
                    </button>
                  </div>
                </form>

                <div className="space-y-4">
                  <h4 className="font-bold text-zinc-900">Existing Problems</h4>
                  <div className="divide-y divide-zinc-100">
                    {codingBank.filter(q => q.companyId === codingForm.companyId).map(q => (
                      <div key={q.id} className="py-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-zinc-900">{q.title}</p>
                          <p className="text-xs text-zinc-500 line-clamp-1">{q.problemStatement}</p>
                        </div>
                        <button 
                          onClick={() => deleteCodingQuestion(q.id)}
                          className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {codingBank.filter(q => q.companyId === codingForm.companyId).length === 0 && (
                      <p className="text-center py-8 text-zinc-400 italic">No coding problems added for this company.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
