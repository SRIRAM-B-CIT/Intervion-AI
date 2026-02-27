"use client";

import React, { useState, useRef } from 'react';
import { 
  Building2, Plus, Trash2, Edit3, Search, Brain, Code, 
  MessageSquare, ChevronRight, Upload, X, Save, Layout, 
  CheckCircle2, FileText, Users, Settings, Clock, Target, GripVertical
} from 'lucide-react';
import { useCmsStore, Company, InterviewRound, RoundType, AptitudeQuestion, CodingQuestion } from '../store/useCmsStore';
import { useAppStore } from '../store/useStore';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import Papa from 'papaparse';

export default function AdminCMS() {
  const { 
    companies, globalAptitudeBank, codingBank,
    addCompany, updateCompany, deleteCompany, 
    setGlobalAptitudeBank, addCodingQuestion, deleteCodingQuestion
  } = useCmsStore();
  
  const { hrGender, hrTone, setHRSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<'companies' | 'aptitude' | 'settings'>('companies');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEditingCompany, setIsEditingCompany] = useState<string | null>(null);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState<Omit<Company, 'id'>>({
    name: '',
    description: '',
    logo: '', 
    targetRole: '',
    workflow: []
  });

  const [isAddingCoding, setIsAddingCoding] = useState(false);
  const [codingForm, setCodingForm] = useState<Omit<CodingQuestion, 'id'>>({
    companyId: '', title: '', problemStatement: '', boilerplate: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyForm({ ...companyForm, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingCompany) {
      updateCompany(isEditingCompany, companyForm);
      setIsEditingCompany(null);
    } else {
      const finalForm = { 
        ...companyForm, 
        logo: companyForm.logo || `https://ui-avatars.com/api/?name=${companyForm.name}&background=10b981&color=fff` 
      };
      addCompany(finalForm);
      setIsAddingCompany(false);
    }
    setCompanyForm({ name: '', description: '', logo: '', targetRole: '', workflow: [] });
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
    setCodingForm({ ...codingForm, title: '', problemStatement: '', boilerplate: '' });
  };

  const availableTopics = Array.from(new Set(globalAptitudeBank.map(q => q.topic)));
  const filteredAptitude = globalAptitudeBank.filter(q => q.question.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Content Management</h1>
          <p className="text-zinc-500 mt-1 font-medium">Manage companies, workflows, and global question banks.</p>
        </div>
        {activeTab === 'companies' && !isAddingCompany && !isEditingCompany && (
          <button 
            onClick={() => setIsAddingCompany(true)}
            className="bg-zinc-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add New Company
          </button>
        )}
        {activeTab === 'aptitude' && (
          <div className="flex gap-3">
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleCsvUpload} />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95"
            >
              <Upload className="w-5 h-5" />
              Import Aptitude CSV
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex p-1 bg-zinc-100 rounded-2xl w-fit border border-zinc-200 shadow-sm">
        {(['companies', 'aptitude', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all uppercase tracking-widest ${
              activeTab === tab ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab === 'companies' ? 'Workflows' : tab === 'aptitude' ? 'Aptitude Bank' : 'AI Config'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Companies View */}
        {activeTab === 'companies' && (
          <motion.div key="companies-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {(isAddingCompany || isEditingCompany) ? (
              <div className="bg-white p-8 rounded-[40px] border border-zinc-200 shadow-xl max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-zinc-900">{isEditingCompany ? 'Edit Workflow' : 'Company Profile'}</h3>
                  <button onClick={() => { setIsAddingCompany(false); setIsEditingCompany(null); }} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-zinc-400" />
                  </button>
                </div>
                
                <form onSubmit={handleCompanySubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    {/* Visual Logo Uploader */}
                    <div className="md:col-span-1 space-y-3">
                       <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Company Logo</label>
                       <div 
                         onClick={() => logoInputRef.current?.click()}
                         className="aspect-square bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all overflow-hidden group"
                       >
                         {companyForm.logo ? (
                           <img src={companyForm.logo} alt="Preview" className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform" />
                         ) : (
                           <div className="text-center p-4">
                             <Upload className="w-8 h-8 text-zinc-300 mx-auto mb-2 group-hover:text-emerald-500 transition-colors" />
                             <span className="text-[10px] font-bold text-zinc-400 uppercase">Click to Upload</span>
                           </div>
                         )}
                       </div>
                       <input type="file" accept="image/*" className="hidden" ref={logoInputRef} onChange={handleLogoUpload} />
                    </div>

                    {/* Metadata */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Company Name</label>
                          <input required type="text" value={companyForm.name} onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Target Role</label>
                          <input required type="text" value={companyForm.targetRole} onChange={(e) => setCompanyForm({...companyForm, targetRole: e.target.value})} placeholder="e.g. SDE-1" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Profile Description</label>
                        <textarea required value={companyForm.description} onChange={(e) => setCompanyForm({...companyForm, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all h-[100px] text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Workflow Builder */}
                  <div className="space-y-6 pt-6 border-t border-zinc-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-black text-zinc-900 flex items-center gap-2 tracking-tight">
                        <Layout className="w-5 h-5 text-emerald-500" /> Pipeline Builder
                      </h4>
                      <button type="button" onClick={addRound} className="bg-zinc-100 text-zinc-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 flex items-center gap-2">
                        <Plus size={14} /> Add Stage
                      </button>
                    </div>

                    <Reorder.Group axis="y" values={companyForm.workflow} onReorder={(nw) => setCompanyForm({ ...companyForm, workflow: nw })} className="space-y-4">
                      {companyForm.workflow.map((round) => (
                        <Reorder.Item key={round.id} value={round} className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col gap-4">
                           <div className="flex items-center gap-4">
                             <GripVertical className="w-5 h-5 text-zinc-300 cursor-grab" />
                             <select value={round.type} onChange={(e) => updateRound(round.id, { type: e.target.value as RoundType })} className="bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold outline-none">
                               <option value="resume">Resume Check</option>
                               <option value="aptitude">Aptitude Test</option>
                               <option value="coding">Coding Lab</option>
                               <option value="hr">HR Interview</option>
                             </select>
                             
                             <div className="flex items-center gap-2 ml-auto">
                               <div className="flex items-center gap-2 bg-zinc-50 px-3 py-2 rounded-xl border border-zinc-200">
                                 <Clock className="w-4 h-4 text-zinc-400" />
                                 <input type="number" value={round.duration} onChange={(e) => updateRound(round.id, { duration: parseInt(e.target.value) })} className="w-12 text-sm font-bold bg-transparent outline-none" />
                                 <span className="text-[10px] text-zinc-400 font-bold uppercase">Min</span>
                               </div>
                               <button type="button" onClick={() => removeRound(round.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </div>
                           </div>
                           
                           {/* Conditionally render cutoff config if Aptitude or Coding */}
                           {(round.type === 'aptitude' || round.type === 'coding') && (
                             <div className="ml-9 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center gap-4">
                                <Target size={16} className="text-zinc-400" />
                                <span className="text-xs font-bold text-zinc-600">Passing Cutoff:</span>
                                <input type="number" value={round.cutoff} onChange={(e) => updateRound(round.id, { cutoff: parseInt(e.target.value) })} className="w-16 px-2 py-1 rounded-lg border border-zinc-200 text-sm font-bold" />
                                <span className="text-xs font-bold text-zinc-400">%</span>
                             </div>
                           )}

                           {/* Aptitude specific config */}
                           {round.type === 'aptitude' && (
                            <div className="grid grid-cols-2 gap-4 pl-9 mt-2">
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
                                          ? currentTopics.filter((t: string) => t !== topic)
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

                           {/* Coding specific config */}
                           {round.type === 'coding' && (
                             <div className="pl-9 mt-2">
                               <div className="space-y-2">
                                 <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Questions to Pull</label>
                                 <div className="flex items-center gap-3">
                                  <input 
                                    type="number" 
                                    value={round.config?.questionCount}
                                    onChange={(e) => updateRound(round.id, { config: { ...round.config, questionCount: parseInt(e.target.value) } })}
                                    className="w-24 px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-bold"
                                  />
                                  <p className="text-[10px] text-zinc-400">Pulled randomly from company's private coding bank.</p>
                                 </div>
                               </div>
                             </div>
                           )}
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                    
                    {companyForm.workflow.length === 0 && (
                      <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-[32px] bg-zinc-50">
                        <Layout className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                        <p className="text-zinc-400 font-bold text-sm">Pipeline is empty. Add a stage to begin.</p>
                      </div>
                    )}
                  </div>

                  <button type="submit" className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95">
                    <Save className="w-5 h-5" />
                    {isEditingCompany ? 'Save Changes' : 'Deploy Company'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companies.map((company) => (
                  <motion.div key={company.id} whileHover={{ y: -4 }} className="bg-white p-6 rounded-[32px] border border-zinc-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-100 p-2 overflow-hidden flex items-center justify-center">
                          <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditCompany(company)} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-400"><Edit3 size={16}/></button>
                          <button onClick={() => deleteCompany(company.id)} className="p-2 hover:bg-red-50 rounded-xl transition-colors text-red-400"><Trash2 size={16}/></button>
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-zinc-900 tracking-tight">{company.name}</h3>
                      <p className="text-[10px] font-black text-emerald-600 mb-3 uppercase tracking-widest">{company.targetRole}</p>
                      <p className="text-sm text-zinc-500 mb-6 line-clamp-2">{company.description}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-zinc-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-100 px-2 py-1 rounded-lg">
                          {codingBank.filter(q => q.companyId === company.id).length} Coding Tasks
                        </span>
                        <button 
                          onClick={() => { setCodingForm({ ...codingForm, companyId: company.id }); setIsAddingCoding(true); }}
                          className="text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:text-emerald-700 flex items-center gap-1"
                        >
                          Manage Lab <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
        
        {/* Aptitude Bank Tab */}
        {activeTab === 'aptitude' && (
          <motion.div key="aptitude-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-white rounded-[32px] border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Search global bank..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl bg-zinc-50 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm outline-none font-medium"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-zinc-500 bg-zinc-100 px-4 py-2 rounded-xl">{globalAptitudeBank.length} Questions Loaded</span>
                </div>
              </div>
              <div className="divide-y divide-zinc-100 max-h-[600px] overflow-y-auto">
                {filteredAptitude.map((q) => (
                  <div key={q.id} className="p-6 hover:bg-zinc-50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                        {q.topic[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 line-clamp-1">{q.question}</h4>
                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-1">
                          {q.topic} • {q.options.length} Options
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-[10px] font-bold text-zinc-600 uppercase">
                        Ans: {q.answer}
                      </span>
                    </div>
                  </div>
                ))}
                {filteredAptitude.length === 0 && globalAptitudeBank.length > 0 && (
                  <div className="py-20 text-center">
                    <p className="text-zinc-400 font-bold">No questions match your search.</p>
                  </div>
                )}
                {globalAptitudeBank.length === 0 && (
                  <div className="py-20 text-center">
                    <FileText className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                    <p className="text-zinc-400 font-bold">Global bank is empty. Upload a CSV to get started.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* AI Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div key="settings-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white p-8 rounded-[40px] border border-zinc-200 shadow-sm max-w-2xl">
            <h3 className="text-xl font-black text-zinc-900 mb-8 flex items-center gap-3">
              <MessageSquare className="text-emerald-500" /> HR Interview Configuration
            </h3>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Interviewer Gender</label>
                <div className="flex gap-4">
                  {(['male', 'female'] as const).map((gender) => (
                    <button
                      key={gender}
                      onClick={() => setHRSettings(gender, hrTone)}
                      className={`flex-1 py-4 rounded-2xl border-2 transition-all font-black uppercase tracking-widest text-xs ${
                        hrGender === gender 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-500/10' 
                          : 'border-zinc-100 bg-zinc-50 text-zinc-400 hover:border-zinc-200'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Interviewer Tone</label>
                <div className="grid grid-cols-3 gap-4">
                  {(['professional', 'friendly', 'strict'] as const).map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setHRSettings(hrGender, tone)}
                      className={`py-4 rounded-2xl border-2 transition-all font-black uppercase tracking-widest text-xs ${
                        hrTone === tone 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-500/10' 
                          : 'border-zinc-100 bg-zinc-50 text-zinc-400 hover:border-zinc-200'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-start gap-3">
                <Settings className="text-zinc-400 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                  <span className="font-bold text-zinc-700">System Note:</span> These settings will apply to all students taking the HR Interview round. The generative AI will adjust its persona and visual avatar generation based on these parameters.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coding Bank Management Modal */}
      <AnimatePresence>
        {isAddingCoding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingCoding(false)} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div>
                  <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Coding Lab Repository</h3>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">Linking to: {companies.find(c => c.id === codingForm.companyId)?.name}</p>
                </div>
                <button onClick={() => setIsAddingCoding(false)} className="p-3 bg-white hover:bg-zinc-100 rounded-full shadow-sm border border-zinc-200 transition-colors">
                  <X className="w-5 h-5 text-zinc-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 flex flex-col md:flex-row gap-8">
                {/* Left: Add Form */}
                <form onSubmit={handleCodingSubmit} className="flex-1 space-y-5">
                  <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-4">Add Challenge</h4>
                  <input 
                    required placeholder="Challenge Title (e.g., Two Sum)" value={codingForm.title} onChange={(e) => setCodingForm({ ...codingForm, title: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm"
                  />
                  <textarea 
                    required placeholder="Detailed Problem Statement & Constraints..." value={codingForm.problemStatement} onChange={(e) => setCodingForm({ ...codingForm, problemStatement: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none h-32 text-sm resize-none"
                  />
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Initial Code (Boilerplate)</label>
                    <textarea 
                      required value={codingForm.boilerplate} onChange={(e) => setCodingForm({ ...codingForm, boilerplate: e.target.value })}
                      className="w-full px-5 py-3 rounded-2xl border border-zinc-200 bg-zinc-900 text-zinc-300 font-mono text-xs h-40 resize-none focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <button type="submit" className="w-full bg-emerald-500 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
                    Push to Repository
                  </button>
                </form>

                {/* Right: Existing List */}
                <div className="md:w-1/2 flex flex-col border-l border-zinc-100 pl-8">
                  <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-6">Current Database</h4>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {codingBank.filter(q => q.companyId === codingForm.companyId).map(q => (
                      <div key={q.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-start justify-between group">
                        <div className="pr-4">
                          <p className="font-bold text-zinc-900 text-sm leading-tight">{q.title}</p>
                          <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{q.problemStatement}</p>
                        </div>
                        <button onClick={() => deleteCodingQuestion(q.id)} className="p-2 bg-white text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl border border-zinc-100 transition-colors shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {codingBank.filter(q => q.companyId === codingForm.companyId).length === 0 && (
                      <div className="text-center py-10 bg-zinc-50 rounded-3xl border border-zinc-100 border-dashed">
                        <Code className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">No challenges yet</p>
                      </div>
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