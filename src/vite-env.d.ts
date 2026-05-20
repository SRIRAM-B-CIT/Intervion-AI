/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_GEMINI_API_KEY: string;
	readonly VITE_GROQ_API_KEY: string;
	readonly VITE_JDOODLE_CLIENT_ID: string;
	readonly VITE_JDOODLE_CLIENT_SECRET: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}