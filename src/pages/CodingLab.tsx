"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  Eye,
  EyeOff,
  FastForward,
  Loader2,
  Play,
  RotateCcw,
  Send,
  Terminal,
  Trophy,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  generateLocalContest,
  type CodingLanguage,
  type CodingProblem,
} from "../data/codingProblemBank";
import { executeWithJDoodle } from "../services/jdoodleService";
import { useCmsStore } from "../store/useCmsStore";
import { useAppStore } from "../store/useStore";

const LANGUAGES = {
  javascript: { label: "JavaScript", editorLanguage: "javascript" },
  python: { label: "Python", editorLanguage: "python" },
  cpp: { label: "C++", editorLanguage: "cpp" },
  java: { label: "Java", editorLanguage: "java" },
} as const;

type Language = CodingLanguage;
type ConsoleLine = { type: "info" | "success" | "error"; text: string };

type CaseResult = {
  caseNumber: number;
  hidden: boolean;
  verdict: string;
  cpuTime?: string;
  memory?: string;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  message?: string;
};

type SubmissionResult = {
  verdict: string;
  passed: number;
  failed: number;
  total: number;
  score: number;
  cases: CaseResult[];
};

type SavedResult = SubmissionResult & { title: string; skipped?: boolean };

function normalizeOutput(value: unknown) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export default function CodingLab() {
  const { currentSession, addWarning, submitRound } = useAppStore();
  const { companies } = useCmsStore();
  const navigate = useNavigate();
  const selectedCompany = companies.find((company) => company.id === currentSession?.companyId);
  const currentRound = selectedCompany?.workflow[currentSession?.currentRoundIndex || 0];

  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [language, setLanguage] = useState<Language>("javascript");
  const [solutions, setSolutions] = useState<Record<string, Partial<Record<Language, string>>>>({});
  const [customInput, setCustomInput] = useState("");
  const [output, setOutput] = useState<ConsoleLine[]>([
    { type: "info", text: "Contest console ready. Generate a contest to begin." },
  ]);
  const [results, setResults] = useState<Record<string, SavedResult>>({});
  const [latestSubmission, setLatestSubmission] = useState<SubmissionResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [generationError, setGenerationError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const initializedRef = useRef(false);
  const ignoreBlurRef = useRef(false);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const currentProblem = problems[currentIdx];
  const code = currentProblem
    ? solutions[currentProblem.id]?.[language] ?? currentProblem.starterCode[language]
    : "";

  const generateContest = useCallback(async () => {
    setIsGenerating(true);
    setGenerationError("");
    setProblems([]);
    setResults({});
    setCurrentIdx(0);
    setIsFinished(false);
    try {
      const generatedProblems = generateLocalContest(currentRound?.config?.questionCount || 2);
      setProblems(generatedProblems);
      setCustomInput(generatedProblems[0].examples[0]?.input || "");
      setOutput([{ type: "info", text: `${generatedProblems.length} bundled problems selected. JDoodle judging is ready.` }]);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Could not generate the contest.");
    } finally {
      setIsGenerating(false);
    }
  }, [currentRound?.config?.questionCount]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void generateContest();
  }, [generateContest]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  useEffect(() => {
    const handleBlur = () => {
      if (ignoreBlurRef.current || !currentSession || currentSession.isRoundSubmitted) return;
      addWarning();
      alert(`Warning: Window focus lost! Tab switching is prohibited. (${currentSession.warnings + 1}/3)`);
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [addWarning, currentSession]);

  const updateCode = (value: string) => {
    if (!currentProblem) return;
    setSolutions((previous) => ({
      ...previous,
      [currentProblem.id]: { ...previous[currentProblem.id], [language]: value },
    }));
  };

  const appendOutput = (line: ConsoleLine) => setOutput((previous) => [...previous, line]);

  const handleRun = async () => {
    if (!code.trim()) {
      appendOutput({ type: "error", text: "The editor is empty." });
      return;
    }
    setIsRunning(true);
    appendOutput({ type: "info", text: `Running ${LANGUAGES[language].label} with JDoodle...` });
    try {
      const data = await executeWithJDoodle(code, language, customInput);
      if (!data.executionSucceeded) {
        appendOutput({ type: "error", text: `${data.errorType}: ${data.message || "Execution failed."}` });
        return;
      }
      appendOutput({
        type: "success",
        text: `Program output:\n${data.output || "(no output)"}\n\nCPU: ${data.cpuTime}s | Memory: ${data.memory} KB`,
      });
    } catch (error) {
      appendOutput({ type: "error", text: error instanceof Error ? error.message : "Code execution failed." });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentProblem || !code.trim()) {
      appendOutput({ type: "error", text: "Write a solution before submitting." });
      return;
    }
    setIsSubmitting(true);
    setLatestSubmission(null);
    appendOutput({ type: "info", text: "Judging with JDoodle against visible and hidden test cases..." });
    try {
      const cases: CaseResult[] = [];
      let passed = 0;
      let terminalVerdict: string | null = null;

      for (let index = 0; index < currentProblem.tests.length; index += 1) {
        const test = currentProblem.tests[index];
        const execution = await executeWithJDoodle(code, language, test.input);
        const accepted = execution.executionSucceeded
          && normalizeOutput(execution.output) === normalizeOutput(test.expectedOutput);
        if (accepted) passed += 1;
        const verdict = accepted
          ? "Accepted"
          : execution.executionSucceeded
            ? "Wrong Answer"
            : execution.errorType || "Runtime Error";
        const caseResult: CaseResult = {
          caseNumber: index + 1,
          hidden: test.hidden,
          verdict,
          cpuTime: execution.cpuTime,
          memory: execution.memory,
        };
        if (!test.hidden || !accepted) {
          caseResult.input = test.input;
          caseResult.expectedOutput = test.expectedOutput;
          caseResult.actualOutput = execution.output;
          caseResult.message = execution.message;
        }
        cases.push(caseResult);
        if (!execution.executionSucceeded) {
          terminalVerdict = verdict;
          break;
        }
      }

      const total = currentProblem.tests.length;
      const result: SubmissionResult = {
        verdict: terminalVerdict || (passed === total ? "Accepted" : "Wrong Answer"),
        passed,
        failed: total - passed,
        total,
        score: Math.round((passed / total) * 100),
        cases,
      };
      setLatestSubmission(result);
      setResults((previous) => ({ ...previous, [currentProblem.id]: { ...result, title: currentProblem.title } }));
      const details = result.cases
        .map((test) => {
          const label = `${test.hidden ? "Hidden" : "Sample"} #${test.caseNumber}: ${test.verdict}`;
          if (!test.hidden || test.verdict === "Accepted") return label;
          return `${label}\nInput:\n${test.input ?? "(unavailable)"}\nExpected:\n${test.expectedOutput ?? "(unavailable)"}\nActual:\n${test.actualOutput?.trim() || test.message || "(no output)"}`;
        })
        .join("\n");
      appendOutput({
        type: result.verdict === "Accepted" ? "success" : "error",
        text: `${result.verdict} — ${result.passed}/${result.total} tests passed (${result.score}%)\n${details}`,
      });
    } catch (error) {
      appendOutput({ type: "error", text: error instanceof Error ? error.message : "Submission failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveToNext = (allowWithoutSavedResult = false) => {
    if (!currentProblem || (!allowWithoutSavedResult && !results[currentProblem.id])) return;
    setLatestSubmission(null);
    setOutput([{ type: "info", text: "Next problem loaded." }]);
    if (currentIdx >= problems.length - 1) {
      ignoreBlurRef.current = true;
      setIsFinished(true);
      return;
    }
    const nextIndex = currentIdx + 1;
    setCurrentIdx(nextIndex);
    setCustomInput(problems[nextIndex].examples[0]?.input || "");
  };

  const handleSkip = () => {
    if (!currentProblem) return;
    const skipped: SavedResult = {
      title: currentProblem.title,
      verdict: "Skipped",
      passed: 0,
      failed: 0,
      total: 0,
      score: 0,
      cases: [],
      skipped: true,
    };
    setResults((previous) => ({ ...previous, [currentProblem.id]: skipped }));
    setLatestSubmission(skipped);
    moveToNext(true);
  };

  const finishAssessment = () => {
    const orderedResults = problems.map((problem) => results[problem.id]).filter(Boolean);
    const average = orderedResults.length
      ? Math.round(orderedResults.reduce((sum, result) => sum + result.score, 0) / problems.length)
      : 0;
    const feedback = orderedResults
      .map((result, index) =>
        `### Question ${index + 1}: ${result.title}\n**${result.verdict} — Score: ${result.score}% (${result.passed}/${result.total} tests passed)**`,
      )
      .join("\n\n---\n\n");
    submitRound(average, feedback);
    navigate("/mock-marathon");
  };

  if (isGenerating || generationError) {
    return (
      <div className="min-h-[600px] flex items-center justify-center bg-[#f8fafc] p-6">
        <div className="max-w-lg w-full bg-white border border-zinc-200 rounded-[32px] p-10 text-center shadow-sm">
          {isGenerating ? (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-5" />
              <h2 className="text-2xl font-black text-zinc-900">Building your coding contest</h2>
              <p className="text-zinc-500 mt-2">Shuffling the verified problem bank and preparing hidden cases…</p>
            </>
          ) : (
            <>
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-5" />
              <h2 className="text-2xl font-black text-zinc-900">Contest generation failed</h2>
              <p className="text-sm text-red-600 mt-3 break-words">{generationError}</p>
              <button onClick={() => void generateContest()} className="mt-6 px-6 py-3 rounded-xl bg-zinc-900 text-white font-bold inline-flex items-center gap-2">
                <RotateCcw size={16} /> Try Again
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (isFinished) {
    const orderedResults = problems.map((problem) => results[problem.id]);
    const average = Math.round(orderedResults.reduce((sum, result) => sum + (result?.score || 0), 0) / problems.length);
    return (
      <div className="min-h-[600px] flex items-center justify-center bg-[#f8fafc] p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl w-full bg-white border border-zinc-200 rounded-[40px] p-10 shadow-xl text-center">
          <Trophy className="w-16 h-16 text-indigo-500 mx-auto mb-5" />
          <h2 className="text-3xl font-black text-zinc-900">Contest Complete</h2>
          <div className="space-y-3 my-8 text-left">
            {problems.map((problem) => {
              const result = results[problem.id];
              return (
                <div key={problem.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <div>
                    <p className="font-bold text-zinc-800">{problem.title}</p>
                    <p className="text-xs text-zinc-500">{result?.verdict || "Not attempted"}</p>
                  </div>
                  <span className={`font-black ${(result?.score || 0) === 100 ? "text-emerald-600" : "text-red-500"}`}>{result?.score || 0}%</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs uppercase tracking-widest text-zinc-400 font-black">Final score</p>
          <p className="text-5xl font-black text-indigo-600 mt-1">{average}%</p>
          <button onClick={finishAssessment} className="mt-8 w-full py-4 rounded-2xl bg-zinc-900 text-white font-black hover:bg-zinc-800">Finish Assessment</button>
        </motion.div>
      </div>
    );
  }

  if (!currentProblem) return null;

  return (
    <div className="flex-1 min-h-[700px] flex flex-col gap-4 p-4 bg-[#f8fafc]">
      <header className="bg-white p-4 rounded-[24px] border border-zinc-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">Q{currentIdx + 1}</div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-zinc-900">{currentProblem.title}</h2>
              <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase ${currentProblem.difficulty === "Easy" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>{currentProblem.difficulty}</span>
            </div>
            <p className="text-xs text-zinc-400 font-bold mt-1">Problem {currentIdx + 1} of {problems.length} · {results[currentProblem.id]?.score ?? 0} points</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex p-1 bg-zinc-100 rounded-xl">
            {(Object.keys(LANGUAGES) as Language[]).map((item) => (
              <button key={item} onClick={() => setLanguage(item)} className={`px-3 py-2 rounded-lg text-[10px] uppercase font-black ${language === item ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-400"}`}>
                {item === "javascript" ? "JS" : item === "cpp" ? "C++" : item}
              </button>
            ))}
          </div>
          <button onClick={handleSkip} disabled={isRunning || isSubmitting} className="px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-600 text-xs font-bold inline-flex items-center gap-2 disabled:opacity-50"><FastForward size={14} /> Skip</button>
          <button onClick={handleRun} disabled={isRunning || isSubmitting} className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold inline-flex items-center gap-2 disabled:opacity-50">{isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Run</button>
          <button onClick={handleSubmit} disabled={isSubmitting || isRunning} className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-2 disabled:opacity-50">{isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit</button>
          {results[currentProblem.id] && (
            <button onClick={() => moveToNext()} className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-xs font-bold">{currentIdx === problems.length - 1 ? "Finish" : "Next"}</button>
          )}
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.65fr)] gap-4 min-h-0">
        <aside className="bg-white rounded-[28px] border border-zinc-200 shadow-sm p-6 overflow-y-auto space-y-6">
          <section>
            <h3 className="font-black text-zinc-900 flex items-center gap-2"><Code2 size={18} className="text-indigo-500" /> Problem</h3>
            <p className="text-sm text-zinc-600 leading-relaxed mt-3 whitespace-pre-wrap">{currentProblem.statement}</p>
          </section>
          <section className="space-y-3 text-sm">
            <div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Input format</p><p className="text-zinc-600 mt-1 whitespace-pre-wrap">{currentProblem.inputFormat}</p></div>
            <div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Output format</p><p className="text-zinc-600 mt-1 whitespace-pre-wrap">{currentProblem.outputFormat}</p></div>
          </section>
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Constraints</p>
            <ul className="text-xs text-zinc-600 space-y-1 list-disc pl-4">{currentProblem.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul>
          </section>
          <section className="space-y-3">
            {currentProblem.examples.map((example, index) => (
              <div key={index} className="rounded-2xl bg-zinc-50 border border-zinc-100 p-4">
                <p className="text-xs font-black text-zinc-700">Example {index + 1}</p>
                <p className="text-[10px] font-black uppercase text-zinc-400 mt-3">Input</p>
                <pre className="text-xs mt-1 whitespace-pre-wrap">{example.input}</pre>
                <p className="text-[10px] font-black uppercase text-zinc-400 mt-3">Output</p>
                <pre className="text-xs mt-1 whitespace-pre-wrap">{example.output}</pre>
                {example.explanation && <p className="text-xs text-zinc-500 mt-3">{example.explanation}</p>}
              </div>
            ))}
          </section>
          <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 flex gap-3">
            <EyeOff size={18} className="text-indigo-600 shrink-0" />
            <p className="text-xs text-indigo-700"><strong>Hidden judging enabled.</strong> Inputs and expected outputs for private edge cases never leave the server.</p>
          </div>
        </aside>

        <main className="grid grid-rows-[minmax(380px,1.4fr)_minmax(260px,1fr)] gap-4 min-h-0">
          <div className="rounded-[28px] overflow-hidden border border-zinc-800 bg-[#1e1e1e] shadow-xl">
            <Editor height="100%" language={LANGUAGES[language].editorLanguage} theme="vs-dark" value={code} onChange={(value) => updateCode(value || "")} options={{ fontSize: 14, minimap: { enabled: false }, padding: { top: 20 }, automaticLayout: true }} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-0">
            <section className="bg-white rounded-[28px] border border-zinc-200 overflow-hidden flex flex-col">
              <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"><Eye size={14} /> Custom input</span><button onClick={() => setCustomInput(currentProblem.examples[0]?.input || "")} className="text-[10px] font-bold text-indigo-500">USE SAMPLE</button></div>
              <textarea value={customInput} onChange={(event) => setCustomInput(event.target.value)} className="flex-1 min-h-[110px] resize-none p-4 font-mono text-xs outline-none" spellCheck={false} />
              {latestSubmission && (
                <div className={`p-4 border-t ${latestSubmission.verdict === "Accepted" ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                  <p className={`font-black ${latestSubmission.verdict === "Accepted" ? "text-emerald-700" : "text-red-700"}`}>{latestSubmission.verdict}</p>
                  <p className="text-xs text-zinc-600 mt-1">{latestSubmission.passed}/{latestSubmission.total} tests passed · {latestSubmission.score}%</p>
                  {latestSubmission.cases
                    .filter((test) => test.hidden && test.verdict !== "Accepted")
                    .map((test) => (
                      <div key={test.caseNumber} className="mt-3 rounded-xl border border-red-200 bg-white/70 p-3 font-mono text-xs text-zinc-700">
                        <p className="font-sans font-black text-red-700">Failed hidden test #{test.caseNumber}</p>
                        <p className="mt-2 text-[10px] font-black uppercase text-zinc-400">Input</p>
                        <pre className="mt-1 whitespace-pre-wrap">{test.input ?? "(unavailable)"}</pre>
                        <p className="mt-2 text-[10px] font-black uppercase text-zinc-400">Expected output</p>
                        <pre className="mt-1 whitespace-pre-wrap">{test.expectedOutput ?? "(unavailable)"}</pre>
                        <p className="mt-2 text-[10px] font-black uppercase text-zinc-400">Your output</p>
                        <pre className="mt-1 whitespace-pre-wrap">{test.actualOutput?.trim() || test.message || "(no output)"}</pre>
                      </div>
                    ))}
                </div>
              )}
            </section>

            <section className="bg-zinc-900 rounded-[28px] border border-zinc-800 overflow-hidden flex flex-col min-h-[220px]">
              <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"><Terminal size={14} /> Judge console</span><button onClick={() => setOutput([])} className="text-[10px] font-bold text-zinc-500">CLEAR</button></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                {output.map((line, index) => <pre key={index} className={`whitespace-pre-wrap ${line.type === "success" ? "text-emerald-400" : line.type === "error" ? "text-red-400" : "text-blue-400"}`}>{line.text}</pre>)}
                <div ref={consoleEndRef} />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
