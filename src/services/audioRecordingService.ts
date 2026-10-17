/**
 * Audio Recording Service for Browser Microphone Capture
 * Captures user speech via MediaRecorder and encodes as base64 for backend STT.
 */

export interface RecordedAudio {
  blob: Blob;
  base64: string;
  mimeType: string;
  durationMs: number;
}

class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private startTime: number = 0;
  private isRecording: boolean = false;

  public get recording(): boolean {
    return this.isRecording;
  }

  /**
   * Starts capturing microphone audio.
   */
  public async startRecording(): Promise<void> {
    if (this.isRecording) {
      this.cancelRecording();
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Microphone API is not supported on this browser/device.");
    }

    this.audioChunks = [];

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Select supported MIME type
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        } else {
          mimeType = "";
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.startTime = Date.now();
      this.mediaRecorder.start(250); // Slice data every 250ms
      this.isRecording = true;
    } catch (err: any) {
      this.cleanup();
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw new Error("Microphone permission was denied. Please allow microphone access to speak.");
      }
      throw new Error(`Failed to access microphone: ${err.message || err.name}`);
    }
  }

  /**
   * Stops recording and returns the encoded audio.
   */
  public stopRecording(): Promise<RecordedAudio> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        return reject(new Error("No active audio recording to stop."));
      }

      const recorder = this.mediaRecorder;
      const durationMs = Date.now() - this.startTime;

      recorder.onstop = async () => {
        try {
          const rawMime = recorder.mimeType || "audio/webm";
          const mimeType = rawMime.split(";")[0].trim().toLowerCase() || "audio/webm";
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });

          if (audioBlob.size === 0) {
            this.cleanup();
            return reject(new Error("Recorded audio is empty. Please speak into the microphone."));
          }

          const base64 = await this.blobToBase64(audioBlob);
          this.cleanup();

          resolve({
            blob: audioBlob,
            base64,
            mimeType,
            durationMs,
          });
        } catch (e) {
          this.cleanup();
          reject(e);
        }
      };

      recorder.onerror = (e: any) => {
        this.cleanup();
        reject(new Error(`Recording error: ${e?.error?.message || "Unknown error"}`));
      };

      try {
        recorder.stop();
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  /**
   * Aborts current recording without saving.
   */
  public cancelRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const audioRecordingService = new AudioRecordingService();
