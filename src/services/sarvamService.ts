/**
 * Client Service for Sarvam AI Speech-to-Text & Text-to-Speech
 * Proxied securely through backend routes (/api/sarvam/stt, /api/sarvam/tts).
 * API keys remain strictly on the backend.
 */

import { SupportedLanguage } from "../types/language";

export interface TranscribeResponse {
  transcript: string;
  language_code: string;
}

export interface SynthesizeResponse {
  audioBase64: string;
  format: string;
}

class SarvamService {
  private currentAudio: HTMLAudioElement | null = null;
  private lastAudioPerKey: Map<string, string> = new Map();

  /**
   * Checks whether the Sarvam API is configured on the backend.
   */
  public async checkAvailability(): Promise<boolean> {
    try {
      const res = await fetch("/api/sarvam/status");
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.available);
    } catch {
      return false;
    }
  }

  /**
   * Transcribes candidate audio using Sarvam STT via the backend proxy.
   */
  public async transcribe(
    base64Audio: string,
    languageCode: SupportedLanguage,
    mimeType?: string
  ): Promise<string> {
    const cleanMime = (mimeType || "audio/webm").split(";")[0].trim().toLowerCase() || "audio/webm";
    const res = await fetch("/api/sarvam/stt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio: base64Audio,
        language_code: languageCode,
        mimeType: cleanMime,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Transcription failed with code ${res.status}`);
    }

    const data: TranscribeResponse = await res.json();
    return data.transcript?.trim() || "";
  }

  /**
   * Converts text into spoken audio using Sarvam TTS via the backend proxy.
   */
  public async synthesize(
    text: string,
    languageCode: SupportedLanguage,
    options?: {
      gender?: "male" | "female";
      speaker?: string;
    }
  ): Promise<string> {
    const res = await fetch("/api/sarvam/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        language_code: languageCode,
        gender: options?.gender || "female",
        speaker: options?.speaker,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Speech synthesis failed with code ${res.status}`);
    }

    const data: SynthesizeResponse = await res.json();
    return data.audioBase64;
  }

  /**
   * Synthesizes and plays audio with controls.
   * Caches audio under cacheKey for easy replay.
   */
  public async speak(
    text: string,
    languageCode: SupportedLanguage,
    options?: {
      gender?: "male" | "female";
      speaker?: string;
      cacheKey?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): Promise<HTMLAudioElement | null> {
    this.stopAudio();

    try {
      options?.onStart?.();
      let audioBase64: string;

      if (options?.cacheKey && this.lastAudioPerKey.has(options.cacheKey)) {
        audioBase64 = this.lastAudioPerKey.get(options.cacheKey)!;
      } else {
        audioBase64 = await this.synthesize(text, languageCode, {
          gender: options?.gender,
          speaker: options?.speaker,
        });
        if (options?.cacheKey) {
          this.lastAudioPerKey.set(options.cacheKey, audioBase64);
        }
      }

      const audioUri = `data:audio/wav;base64,${audioBase64}`;
      const audio = new Audio(audioUri);
      this.currentAudio = audio;

      audio.onended = () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        options?.onEnd?.();
      };

      audio.onerror = (e) => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        options?.onError?.(e);
        options?.onEnd?.();
      };

      await audio.play();
      return audio;
    } catch (err) {
      this.currentAudio = null;
      options?.onError?.(err);
      options?.onEnd?.();
      return null;
    }
  }

  /**
   * Replays the last cached audio for a given key.
   */
  public async replay(cacheKey: string, onEnd?: () => void): Promise<boolean> {
    const audioBase64 = this.lastAudioPerKey.get(cacheKey);
    if (!audioBase64) return false;

    this.stopAudio();
    const audioUri = `data:audio/wav;base64,${audioBase64}`;
    const audio = new Audio(audioUri);
    this.currentAudio = audio;

    audio.onended = () => {
      if (this.currentAudio === audio) this.currentAudio = null;
      onEnd?.();
    };
    audio.onerror = () => {
      if (this.currentAudio === audio) this.currentAudio = null;
      onEnd?.();
    };

    await audio.play();
    return true;
  }

  /**
   * Stops currently playing audio.
   */
  public stopAudio(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
  }

  /**
   * Checks if audio is currently playing.
   */
  public isPlaying(): boolean {
    return Boolean(this.currentAudio && !this.currentAudio.paused);
  }
}

export const sarvamService = new SarvamService();
