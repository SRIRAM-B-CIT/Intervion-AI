import { GoogleGenAI, Type } from "@google/genai";
import { ResumeAnalysis } from "../store/useStore";

export async function analyzeResume(fileBase64: string, mimeType: string): Promise<ResumeAnalysis> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: fileBase64,
              mimeType: mimeType,
            },
          },
          {
            text: "Analyze this resume for ATS compatibility. Provide a detailed analysis in JSON format.",
          },
        ],
      },
    ],
    config: {
      systemInstruction: `You are an expert ATS (Applicant Tracking System) analyzer. 
      Analyze the provided resume and return a structured JSON object.
      The JSON must include:
      - atsScore: (number 0-100)
      - summary: (string, brief overview of the candidate)
      - topSkills: (array of strings)
      - missingKeywords: (array of strings, keywords commonly found in job descriptions for similar roles but missing here)
      - formattingScore: (number 0-100, based on readability and layout)
      - actionItems: (array of strings, specific steps to improve the resume)
      
      Return ONLY the JSON object.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          atsScore: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          topSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          formattingScore: { type: Type.NUMBER },
          actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["atsScore", "summary", "topSkills", "missingKeywords", "formattingScore", "actionItems"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("Invalid response format from AI");
  }
}

export async function generateRoundFeedback(roundType: string, performanceData: any): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        parts: [
          {
            text: `Analyze the student's performance in the ${roundType} round.
            Performance Data: ${JSON.stringify(performanceData)}
            
            Generate a structured response with two clear sections in Markdown using short bullet points:
    ## What You Did
    - [Summary of their mistakes, areas for improvement, or specific observations]
    
    ## What Is Expected
    - [Breakdown of the ideal industry-standard answer, logic, or behavior for this round]
    
    Be constructive, professional, and detailed. Keep the bullet points concise. Do not include any introductory or concluding text outside of these sections.`,
          },
        ],
      },
    ],
  });

  return response.text || "Failed to generate feedback.";
}


export async function generateHRResponse(
  chatHistory: { role: string; text: string }[],
): Promise<string> {
  // Using your exact existing setup
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  // Format the history so the AI understands the back-and-forth
  const formattedHistory = chatHistory
    .map(
      (msg) =>
        `${msg.role === "interviewer" ? "HR" : "Candidate"}: ${msg.text}`,
    )
    .join("\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            {
              text: `You are an expert HR Interviewer conducting a behavioral and technical interview.
              Here is the conversation so far:
              
              ${formattedHistory}
              
              Based on the candidate's last answer, evaluate what they said and generate your NEXT conversational response or question. 
              Keep it professional, empathetic, and under 3 sentences. 
              Do not use prefixes like "HR:" or "Interviewer:" in your response. Just return the spoken text.`,
            },
          ],
        },
      ],
    });

    return response.text || "Could you elaborate on that last point?";
  } catch (error) {
    console.error("HR Response Generation Failed:", error);
    return "I'm having a little trouble connecting. Could you repeat that or elaborate on your last point?";
  }
}