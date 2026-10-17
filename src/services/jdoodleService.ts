import { CapacitorHttp } from "@capacitor/core";
import type { CodingLanguage } from "../data/codingProblemBank";

type JDoodleResponse = {
  output?: string;
  error?: string;
  statusCode?: number;
  memory?: string;
  cpuTime?: string;
  isExecutionSuccess?: boolean;
  isCompiled?: boolean;
  compilationStatus?: number | string | null;
};

export type JDoodleExecutionResult = {
  output: string;
  cpuTime: string;
  memory: string;
  executionSucceeded: boolean;
  errorType?: "Compilation Error" | "Runtime Error";
  message?: string;
};

const LANGUAGE_CONFIG: Record<CodingLanguage, { language: string; versionIndex: string }> = {
  javascript: { language: "nodejs", versionIndex: "5" },
  python: { language: "python3", versionIndex: "5" },
  cpp: { language: "cpp17", versionIndex: "2" },
  java: { language: "java", versionIndex: "4" },
};

const CLIENT_ID = String(import.meta.env.VITE_JDOODLE_CLIENT_ID || "").trim();
const CLIENT_SECRET = String(import.meta.env.VITE_JDOODLE_CLIENT_SECRET || "").trim();

export async function executeWithJDoodle(
  code: string,
  language: CodingLanguage,
  stdin: string,
): Promise<JDoodleExecutionResult> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("JDoodle credentials are missing. Add JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET to .env, then rebuild the APK.");
  }

  const selected = LANGUAGE_CONFIG[language];
  const response = await CapacitorHttp.post({
    url: "https://api.jdoodle.com/v1/execute",
    headers: { "Content-Type": "application/json" },
    data: {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      script: code,
      stdin,
      language: selected.language,
      versionIndex: selected.versionIndex,
      compileOnly: false,
    },
    connectTimeout: 20_000,
    readTimeout: 120_000,
    responseType: "json",
  });

  let data = response.data as JDoodleResponse | string;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data) as JDoodleResponse;
    } catch {
      throw new Error("JDoodle returned an invalid response.");
    }
  }

  if (response.status < 200 || response.status >= 300 || data.statusCode !== 200) {
    throw new Error(data.error || data.output || `JDoodle request failed (${response.status}).`);
  }

  const compilationFailed = data.isCompiled === false
    || (data.compilationStatus != null && Number(data.compilationStatus) !== 0);
  const executionFailed = data.isExecutionSuccess === false;
  const errorType = compilationFailed
    ? "Compilation Error"
    : executionFailed
      ? "Runtime Error"
      : undefined;

  return {
    output: data.output || "",
    cpuTime: data.cpuTime || "-",
    memory: data.memory || "-",
    executionSucceeded: !errorType,
    errorType,
    message: errorType ? data.output || data.error || errorType : undefined,
  };
}
