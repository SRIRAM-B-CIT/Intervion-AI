import { createClient } from "@supabase/supabase-js";

// 1. Get these URLs and Keys from your Supabase Dashboard
// (Project Settings -> API)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Add a safety check for the hackathon
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase environment variables are missing. Check your .env file.",
  );
}

type SupabaseLike = {
  from: (table: string) => {
    select: () => {
      order: (column: string, options?: { ascending?: boolean }) => Promise<{ data: null; error: Error }>;
    };
    insert: (values: unknown) => {
      select: () => Promise<{ data: any[]; error: Error }>;
    };
  };
};

const createNoopSupabase = (): SupabaseLike => ({
  from: (_table: string) => ({
    select: () => ({
      order: async () => ({
        data: null,
        error: new Error("Supabase is not configured"),
      }),
    }),
    insert: (_values: unknown) => ({
      select: async () => ({
        data: [],
        error: new Error("Supabase is not configured"),
      }),
    }),
  }),
});

// 3. Export a safe client. This keeps the app rendering even when Vercel env vars are missing.
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createNoopSupabase();