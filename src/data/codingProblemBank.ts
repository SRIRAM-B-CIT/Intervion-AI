export type CodingTestCase = {
  input: string;
  expectedOutput: string;
  hidden: boolean;
};

export type CodingLanguage = "javascript" | "python" | "cpp" | "java";

export type CodingProblem = {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium";
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  starterCode: Record<CodingLanguage, string>;
  tests: CodingTestCase[];
};

const STARTER_CODE: Record<CodingLanguage, string> = {
  javascript: `const fs = require("fs");
const input = fs.readFileSync(0, "utf8").trim();

// Parse input, solve the problem, and print the answer with console.log().
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

type ProblemDefinition = Omit<CodingProblem, "examples" | "starterCode">;

function problem(definition: ProblemDefinition): CodingProblem {
  return {
    ...definition,
    starterCode: STARTER_CODE,
    examples: definition.tests
      .filter((test) => !test.hidden)
      .map((test) => ({ input: test.input, output: test.expectedOutput })),
  };
}

const PROBLEM_BANK: CodingProblem[] = [
  problem({
    id: "even-element-sum",
    title: "Even Element Sum",
    difficulty: "Easy",
    statement: "Given an array of integers, print the sum of all even-valued elements. Print 0 when no even element exists.",
    inputFormat: "The first line contains N. The second line contains N space-separated integers.",
    outputFormat: "Print one integer: the sum of the even elements.",
    constraints: ["1 ≤ N ≤ 1000", "-10⁶ ≤ each element ≤ 10⁶"],
    tests: [
      { input: "5\n1 2 3 4 5", expectedOutput: "6", hidden: false },
      { input: "4\n-4 7 10 3", expectedOutput: "6", hidden: false },
      { input: "4\n1 3 5 7", expectedOutput: "0", hidden: true },
      { input: "1\n0", expectedOutput: "0", hidden: true },
      { input: "4\n-8 -6 2 11", expectedOutput: "-12", hidden: true },
      { input: "3\n1000000 999999 -1000000", expectedOutput: "0", hidden: true },
    ],
  }),
  problem({
    id: "second-largest",
    title: "Second Largest Distinct Value",
    difficulty: "Easy",
    statement: "Find the second largest distinct integer in an array. If it does not exist, print NONE.",
    inputFormat: "The first line contains N. The second line contains N space-separated integers.",
    outputFormat: "Print the second largest distinct integer, or NONE.",
    constraints: ["1 ≤ N ≤ 1000", "-10⁶ ≤ each element ≤ 10⁶"],
    tests: [
      { input: "5\n8 3 8 5 1", expectedOutput: "5", hidden: false },
      { input: "3\n4 4 4", expectedOutput: "NONE", hidden: false },
      { input: "3\n-1 -5 -3", expectedOutput: "-3", hidden: true },
      { input: "2\n2 1", expectedOutput: "1", hidden: true },
      { input: "5\n9 9 8 8 7", expectedOutput: "8", hidden: true },
      { input: "3\n1000000 -1000000 0", expectedOutput: "0", hidden: true },
    ],
  }),
  problem({
    id: "rotate-array-right",
    title: "Rotate Array Right",
    difficulty: "Medium",
    statement: "Rotate an integer array to the right by K positions and print the resulting array. K may be larger than N.",
    inputFormat: "The first line contains N and K. The second line contains N space-separated integers.",
    outputFormat: "Print the rotated array as space-separated integers.",
    constraints: ["1 ≤ N ≤ 1000", "0 ≤ K ≤ 10⁹"],
    tests: [
      { input: "5 2\n1 2 3 4 5", expectedOutput: "4 5 1 2 3", hidden: false },
      { input: "3 3\n7 8 9", expectedOutput: "7 8 9", hidden: false },
      { input: "1 100\n1", expectedOutput: "1", hidden: true },
      { input: "4 1\n-3 -2 -1 0", expectedOutput: "0 -3 -2 -1", hidden: true },
      { input: "3 8\n10 20 30", expectedOutput: "20 30 10", hidden: true },
      { input: "5 0\n5 4 3 2 1", expectedOutput: "5 4 3 2 1", hidden: true },
    ],
  }),
  problem({
    id: "balanced-brackets",
    title: "Balanced Brackets",
    difficulty: "Medium",
    statement: "Given a string containing only (), [] and {}, print true if every opening bracket is closed in the correct order; otherwise print false.",
    inputFormat: "A single non-empty string containing only bracket characters.",
    outputFormat: "Print true or false in lowercase.",
    constraints: ["1 ≤ string length ≤ 100000", "The string contains only ()[]{}"],
    tests: [
      { input: "()[]{}", expectedOutput: "true", hidden: false },
      { input: "([)]", expectedOutput: "false", hidden: false },
      { input: "{[()]}", expectedOutput: "true", hidden: true },
      { input: "(((", expectedOutput: "false", hidden: true },
      { input: "]", expectedOutput: "false", hidden: true },
      { input: "({[]})[]", expectedOutput: "true", hidden: true },
    ],
  }),
  problem({
    id: "first-unique-character",
    title: "First Unique Character",
    difficulty: "Easy",
    statement: "Print the first character that occurs exactly once in the given lowercase string. Print NONE if every character repeats.",
    inputFormat: "A single non-empty lowercase string without spaces.",
    outputFormat: "Print one character, or NONE.",
    constraints: ["1 ≤ string length ≤ 100000", "The string contains only a-z"],
    tests: [
      { input: "swiss", expectedOutput: "w", hidden: false },
      { input: "aabb", expectedOutput: "NONE", hidden: false },
      { input: "z", expectedOutput: "z", hidden: true },
      { input: "leetcode", expectedOutput: "l", hidden: true },
      { input: "aabbccd", expectedOutput: "d", hidden: true },
      { input: "xxyyzzqpp", expectedOutput: "q", hidden: true },
    ],
  }),
  problem({
    id: "move-zeroes",
    title: "Move Zeroes to the End",
    difficulty: "Easy",
    statement: "Move every zero to the end of the array while preserving the relative order of all non-zero elements.",
    inputFormat: "The first line contains N. The second line contains N space-separated integers.",
    outputFormat: "Print the resulting array as space-separated integers.",
    constraints: ["1 ≤ N ≤ 100000", "-10⁶ ≤ each element ≤ 10⁶"],
    tests: [
      { input: "5\n0 1 0 3 12", expectedOutput: "1 3 12 0 0", hidden: false },
      { input: "3\n1 2 3", expectedOutput: "1 2 3", hidden: false },
      { input: "3\n0 0 0", expectedOutput: "0 0 0", hidden: true },
      { input: "5\n-1 0 -2 0 5", expectedOutput: "-1 -2 5 0 0", hidden: true },
      { input: "1\n0", expectedOutput: "0", hidden: true },
      { input: "6\n4 0 0 2 0 1", expectedOutput: "4 2 1 0 0 0", hidden: true },
    ],
  }),
];

export function generateLocalContest(requestedCount: number): CodingProblem[] {
  const count = Math.min(PROBLEM_BANK.length, Math.max(1, Math.floor(requestedCount) || 2));
  const shuffled = [...PROBLEM_BANK];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
}
