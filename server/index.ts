import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

type LanguageKey = "javascript" | "python" | "cpp" | "java";

type TestCase = {
  input: string;
  expectedOutput: string;
  hidden: boolean;
};

type Problem = {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium";
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  starterCode: Record<LanguageKey, string>;
  tests: TestCase[];
};

type Contest = {
  createdAt: number;
  problems: Problem[];
};

const app = express();
const contests = new Map<string, Contest>();
const PORT = Number(process.env.PORT || 3000);

const LANGUAGE_CONFIG: Record<LanguageKey, { language: string; versionIndex: string }> = {
  javascript: { language: "nodejs", versionIndex: "4" },
  python: { language: "python3", versionIndex: "4" },
  cpp: { language: "cpp17", versionIndex: "1" },
  java: { language: "java", versionIndex: "4" },
};

const STARTER_CODE: Record<LanguageKey, string> = {
  javascript: `const fs = require("fs");
const input = fs.readFileSync(0, "utf8").trim();

// Parse input, solve the problem, and print the answer.
`,
  python: `import sys

data = sys.stdin.read().strip()

# Parse input, solve the problem, and print the answer.
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // Parse input, solve the problem, and print the answer.
    return 0;
}
`,
  java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        Scanner scanner = new Scanner(System.in);
        // Parse input, solve the problem, and print the answer.
    }
}
`,
};

app.use(express.json({ limit: "15mb" }));

const allowedOrigins = new Set([
  "http://localhost",
  "https://localhost",
  "capacitor://localhost",
  ...String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

app.use((request, response, next) => {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  }
  if (request.method === "OPTIONS") return response.sendStatus(204);
  next();
});

function publicProblem(problem: Problem) {
  const { tests: _tests, ...visible } = problem;
  return visible;
}

function normalizeOutput(value: unknown) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function createProblem(
  problem: Omit<Problem, "id" | "starterCode" | "examples">,
): Problem {
  return {
    ...problem,
    id: crypto.randomUUID(),
    starterCode: STARTER_CODE,
    examples: problem.tests
      .filter((test) => !test.hidden)
      .map((test) => ({ input: test.input, output: test.expectedOutput })),
  };
}

function shuffledQuestionBank(count: number): Problem[] {
  const factories = [
    makeEvenSumProblem,
    makeSecondLargestProblem,
    makeRotationProblem,
    makeBalancedBracketsProblem,
    makeFirstUniqueCharacterProblem,
    makeMoveZeroesProblem,
  ];

  for (let index = factories.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [factories[index], factories[randomIndex]] = [factories[randomIndex], factories[index]];
  }

  return factories.slice(0, count).map((factory) => factory());
}

function makeEvenSumProblem(): Problem {
  const makeCase = (values: number[], hidden: boolean): TestCase => ({
    input: `${values.length}\n${values.join(" ")}`,
    expectedOutput: String(values.filter((value) => value % 2 === 0).reduce((sum, value) => sum + value, 0)),
    hidden,
  });
  const tests = [
    makeCase([1, 2, 3, 4, 5], false),
    makeCase([-4, 7, 10, 3], false),
    makeCase([1, 3, 5, 7], true),
    makeCase([0], true),
    makeCase([-8, -6, 2, 11], true),
    makeCase([1000000, 999999, -1000000], true),
  ];
  return createProblem({
    title: "Even Element Sum",
    difficulty: "Easy",
    statement: "Given an array of integers, print the sum of all even-valued elements. Print 0 when no even element exists.",
    inputFormat: "The first line contains N. The second line contains N space-separated integers.",
    outputFormat: "Print one integer: the sum of the even elements.",
    constraints: ["1 ≤ N ≤ 1000", "-10⁶ ≤ each element ≤ 10⁶"],
    tests,
  });
}

function makeSecondLargestProblem(): Problem {
  const solve = (values: number[]) => {
    const distinct = [...new Set(values)].sort((a, b) => b - a);
    return distinct.length > 1 ? String(distinct[1]) : "NONE";
  };
  const makeCase = (values: number[], hidden: boolean): TestCase => ({
    input: `${values.length}\n${values.join(" ")}`,
    expectedOutput: solve(values),
    hidden,
  });
  const tests = [
    makeCase([8, 3, 8, 5, 1], false),
    makeCase([4, 4, 4], false),
    makeCase([-1, -5, -3], true),
    makeCase([2, 1], true),
    makeCase([9, 9, 8, 8, 7], true),
    makeCase([1000000, -1000000, 0], true),
  ];
  return createProblem({
    title: "Second Largest Distinct Value",
    difficulty: "Easy",
    statement: "Find the second largest distinct integer in an array. If it does not exist, print NONE.",
    inputFormat: "The first line contains N. The second line contains N space-separated integers.",
    outputFormat: "Print the second largest distinct integer, or NONE.",
    constraints: ["1 ≤ N ≤ 1000", "-10⁶ ≤ each element ≤ 10⁶"],
    tests,
  });
}

function makeRotationProblem(): Problem {
  const solve = (values: number[], k: number) => {
    const shift = ((k % values.length) + values.length) % values.length;
    return [...values.slice(values.length - shift), ...values.slice(0, values.length - shift)].join(" ");
  };
  const makeCase = (values: number[], k: number, hidden: boolean): TestCase => ({
    input: `${values.length} ${k}\n${values.join(" ")}`,
    expectedOutput: solve(values, k),
    hidden,
  });
  const tests = [
    makeCase([1, 2, 3, 4, 5], 2, false),
    makeCase([7, 8, 9], 3, false),
    makeCase([1], 100, true),
    makeCase([-3, -2, -1, 0], 1, true),
    makeCase([10, 20, 30], 8, true),
    makeCase([5, 4, 3, 2, 1], 0, true),
  ];
  return createProblem({
    title: "Rotate Array Right",
    difficulty: "Medium",
    statement: "Rotate an integer array to the right by K positions and print the resulting array. K may be larger than N.",
    inputFormat: "The first line contains N and K. The second line contains N space-separated integers.",
    outputFormat: "Print the rotated array as space-separated integers.",
    constraints: ["1 ≤ N ≤ 1000", "0 ≤ K ≤ 10⁹"],
    tests,
  });
}

function makeBalancedBracketsProblem(): Problem {
  const solve = (value: string) => {
    const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
    const stack: string[] = [];
    for (const character of value) {
      if ("([{".includes(character)) stack.push(character);
      else if (stack.pop() !== pairs[character]) return "false";
    }
    return stack.length === 0 ? "true" : "false";
  };
  const makeCase = (value: string, hidden: boolean): TestCase => ({ input: value, expectedOutput: solve(value), hidden });
  const tests = [
    makeCase("()[]{}", false),
    makeCase("([)]", false),
    makeCase("{[()]}", true),
    makeCase("(((", true),
    makeCase("]", true),
    makeCase("({[]})[]", true),
  ];
  return createProblem({
    title: "Balanced Brackets",
    difficulty: "Medium",
    statement: "Given a string containing only (), [] and {}, print true if every opening bracket is closed in the correct order; otherwise print false.",
    inputFormat: "A single non-empty string containing only bracket characters.",
    outputFormat: "Print true or false in lowercase.",
    constraints: ["1 ≤ string length ≤ 100000", "The string contains only ()[]{}"],
    tests,
  });
}

function makeFirstUniqueCharacterProblem(): Problem {
  const solve = (value: string) => {
    const counts = new Map<string, number>();
    for (const character of value) counts.set(character, (counts.get(character) || 0) + 1);
    return [...value].find((character) => counts.get(character) === 1) || "NONE";
  };
  const makeCase = (value: string, hidden: boolean): TestCase => ({ input: value, expectedOutput: solve(value), hidden });
  const tests = [
    makeCase("swiss", false),
    makeCase("aabb", false),
    makeCase("z", true),
    makeCase("leetcode", true),
    makeCase("aabbccd", true),
    makeCase("xxyyzzqpp", true),
  ];
  return createProblem({
    title: "First Unique Character",
    difficulty: "Easy",
    statement: "Print the first character that occurs exactly once in the given lowercase string. Print NONE if every character repeats.",
    inputFormat: "A single non-empty lowercase string without spaces.",
    outputFormat: "Print one character, or NONE.",
    constraints: ["1 ≤ string length ≤ 100000", "The string contains only a-z"],
    tests,
  });
}

function makeMoveZeroesProblem(): Problem {
  const solve = (values: number[]) => [...values.filter((value) => value !== 0), ...values.filter((value) => value === 0)].join(" ");
  const makeCase = (values: number[], hidden: boolean): TestCase => ({
    input: `${values.length}\n${values.join(" ")}`,
    expectedOutput: solve(values),
    hidden,
  });
  const tests = [
    makeCase([0, 1, 0, 3, 12], false),
    makeCase([1, 2, 3], false),
    makeCase([0, 0, 0], true),
    makeCase([-1, 0, -2, 0, 5], true),
    makeCase([0], true),
    makeCase([4, 0, 0, 2, 0, 1], true),
  ];
  return createProblem({
    title: "Move Zeroes to the End",
    difficulty: "Easy",
    statement: "Move every zero to the end of the array while preserving the relative order of all non-zero elements.",
    inputFormat: "The first line contains N. The second line contains N space-separated integers.",
    outputFormat: "Print the resulting array as space-separated integers.",
    constraints: ["1 ≤ N ≤ 100000", "-10⁶ ≤ each element ≤ 10⁶"],
    tests,
  });
}

async function executeCode(code: string, language: LanguageKey, stdin: string) {
  const clientId = process.env.JDOODLE_CLIENT_ID;
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("JDoodle credentials are missing on the server. Set JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET.");
  }
  const selected = LANGUAGE_CONFIG[language];
  if (!selected) throw new Error("Unsupported language");

  const response = await fetch("https://api.jdoodle.com/v1/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId,
      clientSecret,
      script: code,
      stdin,
      language: selected.language,
      versionIndex: selected.versionIndex,
      compileOnly: false,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await response.json() as {
    statusCode?: number;
    output?: string;
    error?: string;
    memory?: string;
    cpuTime?: string;
    isExecutionSuccess?: boolean;
    isCompiled?: boolean;
    compilationStatus?: number | string;
  };
  if (!response.ok || data.statusCode !== 200) {
    throw new Error(data.error || data.output || `JDoodle execution failed (${response.status})`);
  }
  return {
    output: data.output ?? "",
    memory: data.memory ?? "-",
    cpuTime: data.cpuTime ?? "-",
    executionSucceeded:
      data.isExecutionSuccess !== false &&
      data.isCompiled !== false &&
      (data.compilationStatus == null || Number(data.compilationStatus) === 0),
    errorType:
      data.isCompiled === false || (data.compilationStatus != null && Number(data.compilationStatus) !== 0)
        ? "Compilation Error"
        : data.isExecutionSuccess === false
          ? "Runtime Error"
          : null,
  };
}

app.post("/api/coding/generate", async (request, response) => {
  try {
    const requestedCount = Number(request.body?.questionCount || 2);
    const questionCount = Math.min(6, Math.max(1, Number.isFinite(requestedCount) ? requestedCount : 2));
    const problems = shuffledQuestionBank(questionCount);
    const contestId = crypto.randomUUID();
    contests.set(contestId, { createdAt: Date.now(), problems });
    response.json({ contestId, problems: problems.map(publicProblem) });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "Could not create contest" });
  }
});

app.post("/api/coding/run", async (request, response) => {
  try {
    const code = String(request.body?.code || "");
    const language = request.body?.language as LanguageKey;
    const stdin = String(request.body?.stdin || "");
    if (!code.trim()) return response.status(400).json({ error: "Code is required" });
    const result = await executeCode(code, language, stdin);
    response.json(result);
  } catch (error) {
    response.status(502).json({ error: error instanceof Error ? error.message : "Execution failed" });
  }
});

app.post("/api/coding/submit", async (request, response) => {
  try {
    const contest = contests.get(String(request.body?.contestId || ""));
    const problem = contest?.problems.find((item) => item.id === request.body?.problemId);
    const language = request.body?.language as LanguageKey;
    const code = String(request.body?.code || "");
    if (!contest || !problem) return response.status(404).json({ error: "Contest expired. Generate a new contest." });
    if (!code.trim()) return response.status(400).json({ error: "Code is required" });

    const caseResults: Array<Record<string, unknown>> = [];
    let passed = 0;
    let terminalVerdict: string | null = null;

    for (let index = 0; index < problem.tests.length; index += 1) {
      const test = problem.tests[index];
      try {
        const execution = await executeCode(code, language, test.input);
        const accepted = execution.executionSucceeded && normalizeOutput(execution.output) === normalizeOutput(test.expectedOutput);
        if (accepted) passed += 1;
        const result: Record<string, unknown> = {
          caseNumber: index + 1,
          hidden: test.hidden,
          verdict: accepted ? "Accepted" : execution.executionSucceeded ? "Wrong Answer" : execution.errorType || "Runtime Error",
          cpuTime: execution.cpuTime,
          memory: execution.memory,
        };
        // Keep successful hidden cases private, but reveal a failed case so the
        // candidate can understand and fix the edge case before resubmitting.
        if (!test.hidden || !accepted) {
          result.input = test.input;
          result.expectedOutput = test.expectedOutput;
          result.actualOutput = execution.output;
        }
        caseResults.push(result);
        if (!execution.executionSucceeded) {
          terminalVerdict = execution.errorType || "Runtime Error";
          break;
        }
      } catch (error) {
        terminalVerdict = "Compilation or Execution Error";
        caseResults.push({
          caseNumber: index + 1,
          hidden: test.hidden,
          verdict: terminalVerdict,
          input: test.input,
          expectedOutput: test.expectedOutput,
          message: error instanceof Error ? error.message : "Execution failed",
        });
        break;
      }
    }

    const total = problem.tests.length;
    const score = Math.round((passed / total) * 100);
    const verdict = terminalVerdict || (passed === total ? "Accepted" : "Wrong Answer");
    response.json({ verdict, passed, failed: total - passed, total, score, cases: caseResults });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "Submission failed" });
  }
});

// ==========================================
// SARVAM AI SPEECH-TO-TEXT & TEXT-TO-SPEECH ENDPOINTS
// ==========================================

// Check if SARVAM_API_KEY is configured on the backend
app.get("/api/sarvam/status", (_req, res) => {
  const hasKey = Boolean(process.env.SARVAM_API_KEY && process.env.SARVAM_API_KEY.trim().length > 0);
  res.json({ available: hasKey });
});

// Sarvam STT (Speech-to-Text) using saaras:v4
app.post("/api/sarvam/stt", async (req, res) => {
  try {
    const apiKey = process.env.SARVAM_API_KEY?.trim();
    if (!apiKey) {
      return res.status(503).json({
        error: "SARVAM_API_KEY is not configured on the server. English and typed responses remain available.",
        available: false,
      });
    }

    const { audio, language_code, mimeType } = req.body || {};
    if (!audio || typeof audio !== "string") {
      return res.status(400).json({ error: "Audio base64 data is required." });
    }

    const validLangs = ["hi-IN", "ta-IN", "te-IN", "ml-IN", "en-IN", "unknown"];
    const targetLang = validLangs.includes(language_code) ? language_code : "unknown";

    const base64Clean = audio.includes(",") ? audio.split(",")[1] : audio;
    const audioBuffer = Buffer.from(base64Clean, "base64");

    if (audioBuffer.length === 0) {
      return res.status(400).json({ error: "Empty audio buffer received." });
    }
    if (audioBuffer.length > 15 * 1024 * 1024) {
      return res.status(413).json({ error: "Audio file exceeds 15MB limit." });
    }

    // Clean and validate MIME type for Sarvam STT.
    // Sarvam API strictly requires base MIME type WITHOUT parameters (e.g. 'audio/webm', rejecting 'audio/webm;codecs=opus').
    let cleanMime = "audio/webm";
    if (typeof mimeType === "string" && mimeType.trim()) {
      cleanMime = mimeType.split(";")[0].trim().toLowerCase();
    }

    const allowedSarvamTypes = new Set([
      "audio/webm",
      "video/webm",
      "audio/wav",
      "audio/x-wav",
      "audio/wave",
      "audio/pcm_s16le",
      "audio/mp3",
      "audio/mpeg",
      "audio/ogg",
      "audio/opus",
      "audio/flac",
      "audio/mp4",
      "audio/x-m4a",
      "audio/aac",
      "application/octet-stream",
    ]);

    if (!allowedSarvamTypes.has(cleanMime)) {
      if (cleanMime.includes("webm")) cleanMime = "audio/webm";
      else if (cleanMime.includes("wav")) cleanMime = "audio/wav";
      else if (cleanMime.includes("mp4") || cleanMime.includes("m4a")) cleanMime = "audio/mp4";
      else if (cleanMime.includes("ogg") || cleanMime.includes("opus")) cleanMime = "audio/ogg";
      else if (cleanMime.includes("mp3") || cleanMime.includes("mpeg")) cleanMime = "audio/mp3";
      else cleanMime = "audio/webm";
    }

    let filename = "speech.webm";
    if (cleanMime.includes("wav")) filename = "speech.wav";
    else if (cleanMime.includes("mp4") || cleanMime.includes("m4a")) filename = "speech.mp4";
    else if (cleanMime.includes("mp3") || cleanMime.includes("mpeg")) filename = "speech.mp3";
    else if (cleanMime.includes("ogg")) filename = "speech.ogg";

    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: cleanMime });
    formData.append("file", audioBlob, filename);
    formData.append("model", "saaras:v4");
    formData.append("language_code", targetLang);

    const sarvamRes = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: formData,
    });

    if (!sarvamRes.ok) {
      const errText = await sarvamRes.text();
      console.warn(`Sarvam STT failed (${sarvamRes.status}):`, errText);
      let parsedErr: any = null;
      try {
        parsedErr = JSON.parse(errText);
      } catch {}
      const userMessage = parsedErr?.error?.message || `Sarvam STT error (${sarvamRes.status})`;
      return res.status(sarvamRes.status).json({
        error: userMessage,
        details: errText,
      });
    }

    const data = (await sarvamRes.json()) as any;
    return res.json({
      transcript: data?.transcript || "",
      language_code: data?.language_code || targetLang,
      request_id: data?.request_id,
    });
  } catch (err: any) {
    console.error("Sarvam STT endpoint error:", err);
    return res.status(500).json({ error: err.message || "Failed to transcribe audio." });
  }
});

// Sarvam TTS (Text-to-Speech) using bulbul:v4-flash with fallback to bulbul:v3
app.post("/api/sarvam/tts", async (req, res) => {
  try {
    const apiKey = process.env.SARVAM_API_KEY?.trim();
    if (!apiKey) {
      return res.status(503).json({
        error: "SARVAM_API_KEY is not configured on the server. English audio and text responses remain available.",
        available: false,
      });
    }

    const { text, language_code, speaker, gender } = req.body || {};
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Text is required for TTS." });
    }

    const validLangs = ["hi-IN", "ta-IN", "te-IN", "ml-IN", "en-IN", "bn-IN", "gu-IN", "kn-IN", "mr-IN", "od-IN", "pa-IN"];
    const targetLang = validLangs.includes(language_code) ? language_code : "hi-IN";

    let chosenSpeaker = speaker;
    if (!chosenSpeaker) {
      if (gender === "male") {
        if (targetLang === "ta-IN") chosenSpeaker = "gokul";
        else chosenSpeaker = "aditya";
      } else {
        if (targetLang === "te-IN") chosenSpeaker = "kavitha";
        else chosenSpeaker = "priya";
      }
    }

    const cleanText = text.trim().slice(0, 2500);
    const modelsToTry = ["bulbul:v4-flash", "bulbul:v3"];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const payload: any = {
          text: cleanText,
          language_code: targetLang,
          model,
        };
        if (chosenSpeaker && model === "bulbul:v3") {
          payload.speaker = chosenSpeaker;
        }

        const sarvamRes = await fetch("https://api.sarvam.ai/text-to-speech", {
          method: "POST",
          headers: {
            "api-subscription-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!sarvamRes.ok) {
          const errText = await sarvamRes.text();
          console.warn(`Sarvam TTS model ${model} failed (${sarvamRes.status}):`, errText);
          lastError = new Error(`Sarvam TTS (${sarvamRes.status}): ${errText}`);
          continue;
        }

        const data = (await sarvamRes.json()) as any;
        const audioBase64 = data?.audios?.[0];
        if (audioBase64) {
          return res.json({
            audioBase64,
            format: "wav",
            request_id: data?.request_id,
          });
        }
      } catch (mErr) {
        console.warn(`Sarvam TTS model ${model} error:`, mErr);
        lastError = mErr;
      }
    }

    return res.status(502).json({
      error: lastError?.message || "Failed to synthesize speech using Sarvam TTS.",
    });
  } catch (err: any) {
    console.error("Sarvam TTS endpoint error:", err);
    return res.status(500).json({ error: err.message || "Failed to synthesize speech." });
  }
});

setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, contest] of contests) if (contest.createdAt < cutoff) contests.delete(id);
}, 30 * 60 * 1000).unref();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(root, "dist")));
  app.get("*", (_request, response) => response.sendFile(path.join(root, "dist", "index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
}

app.listen(PORT, () => {
  console.log(`Hackbells contest server running at http://localhost:${PORT}`);
});
