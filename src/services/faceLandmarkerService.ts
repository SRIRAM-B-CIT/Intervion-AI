/**
 * MediaPipe Face Landmarker Service for Intervion AI
 * 
 * Provides client-side, privacy-preserving face landmark detection,
 * head orientation calculation, and visual posture alignment metrics.
 * 
 * All processing is performed strictly inside the browser.
 * No camera frames or facial data are ever transmitted to external services.
 */

import { FilesetResolver, FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision";

// Canonical Google CDN locations for MediaPipe Tasks Vision Web
const MEDIAPIPE_WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";
const MODEL_ASSET_PATH = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export interface FaceAnalysisResult {
  faceDetected: boolean;
  faceCount: number;
  postureScore: number; // 0 to 100
  feedback: string;
  metrics: {
    yaw: number; // degrees: negative = left, positive = right
    pitch: number; // degrees: negative = down, positive = up
    roll: number; // degrees: tilt left/right
    centerX: number; // 0 to 1 normalized
    centerY: number; // 0 to 1 normalized
    faceScale: number; // normalized face scale
  } | null;
}

export interface SessionMetricsSummary {
  totalFramesAnalyzed: number;
  framesWithFace: number;
  faceVisibilityRate: number; // percentage 0 - 100
  averageAlignmentScore: number; // 0 - 100
  multipleFacesCount: number;
  stabilityScore: number; // 0 - 100 consistency
}

class FaceLandmarkerService {
  private landmarker: FaceLandmarker | null = null;
  private initPromise: Promise<FaceLandmarker | null> | null = null;
  private isInitializing = false;
  private lastVideoTime = -1;

  // Session-wide tracking
  private sessionFrames = 0;
  private sessionFaceFrames = 0;
  private sessionScores: number[] = [];
  private sessionMultipleFaces = 0;
  private sessionCenterPositions: { x: number; y: number }[] = [];

  /**
   * Initializes the MediaPipe FaceLandmarker instance with GPU acceleration,
   * falling back automatically to CPU if GPU delegate is unavailable.
   */
  public async initialize(): Promise<FaceLandmarker | null> {
    if (this.landmarker) return this.landmarker;
    if (this.initPromise) return this.initPromise;

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);

        // Attempt GPU acceleration first
        try {
          this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: MODEL_ASSET_PATH,
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 2,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputFacialTransformationMatrixes: false,
          });
          return this.landmarker;
        } catch (gpuErr) {
          console.warn("MediaPipe GPU delegate initialization failed, falling back to CPU:", gpuErr);
          this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: MODEL_ASSET_PATH,
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numFaces: 2,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputFacialTransformationMatrixes: false,
          });
          return this.landmarker;
        }
      } catch (err) {
        console.error("Failed to initialize MediaPipe Face Landmarker:", err);
        return null;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initPromise;
  }

  /**
   * Resets session tracking statistics for a new interview.
   */
  public resetSession(): void {
    this.sessionFrames = 0;
    this.sessionFaceFrames = 0;
    this.sessionScores = [];
    this.sessionMultipleFaces = 0;
    this.sessionCenterPositions = [];
    this.lastVideoTime = -1;
  }

  /**
   * Performs face landmark detection on an active HTMLVideoElement frame
   * and computes objective geometric metrics.
   */
  public processVideoFrame(videoElement: HTMLVideoElement): FaceAnalysisResult | null {
    if (!this.landmarker) {
      return null;
    }

    const minReadyState = typeof HTMLMediaElement !== "undefined" ? HTMLMediaElement.HAVE_CURRENT_DATA : 2;
    if (
      videoElement.readyState < minReadyState ||
      videoElement.videoWidth === 0 ||
      videoElement.videoHeight === 0 ||
      videoElement.paused ||
      videoElement.ended
    ) {
      return null;
    }

    // Ensure timestamp is monotonically increasing as required by MediaPipe VIDEO mode
    const now = performance.now();
    const timestamp = now > this.lastVideoTime ? now : this.lastVideoTime + 1;
    this.lastVideoTime = timestamp;

    let result: FaceLandmarkerResult;
    try {
      result = this.landmarker.detectForVideo(videoElement, timestamp);
    } catch (err) {
      console.error("MediaPipe detection error on video frame:", err);
      return null;
    }

    this.sessionFrames++;

    const faceCount = result.faceLandmarks ? result.faceLandmarks.length : 0;

    // Case 1: No face detected
    if (faceCount === 0) {
      this.sessionScores.push(0);
      return {
        faceDetected: false,
        faceCount: 0,
        postureScore: 0,
        feedback: "No face detected in frame",
        metrics: null,
      };
    }

    this.sessionFaceFrames++;

    // Case 2: Multiple faces detected
    if (faceCount > 1) {
      this.sessionMultipleFaces++;
      const score = 50;
      this.sessionScores.push(score);
      return {
        faceDetected: true,
        faceCount,
        postureScore: score,
        feedback: "Multiple faces detected in frame",
        metrics: null,
      };
    }

    // Case 3: Exactly one face detected — compute geometric landmarks
    const landmarks = result.faceLandmarks[0];
    if (!landmarks || landmarks.length < 468) {
      return null;
    }

    // Key Landmark Indices (MediaPipe FaceMesh):
    // 1: Nose tip
    // 152: Chin
    // 10: Forehead midline
    // 33: Left eye outer corner
    // 263: Right eye outer corner
    // 234: Left cheek / face lateral edge
    // 454: Right cheek / face lateral edge
    const nose = landmarks[1];
    const chin = landmarks[152];
    const forehead = landmarks[10];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];

    // 1. Calculate approximate Yaw (horizontal rotation)
    // Compare nose horizontal position relative to left and right cheeks
    const distNoseLeft = Math.abs(nose.x - leftCheek.x);
    const distNoseRight = Math.abs(rightCheek.x - nose.x);
    const totalCheekDist = distNoseLeft + distNoseRight;
    const yawRatio = totalCheekDist > 0 ? (distNoseLeft - distNoseRight) / totalCheekDist : 0;
    // Positive = turned right, negative = turned left
    const yaw = Math.round(yawRatio * 60);

    // 2. Calculate approximate Pitch (vertical tilt)
    // Compare 3D depth difference (z) and vertical distribution between forehead, nose, and chin
    const dyForeheadChin = chin.y - forehead.y;
    const dzForeheadChin = chin.z - forehead.z;
    const pitchRad = dyForeheadChin !== 0 ? Math.atan2(dzForeheadChin, dyForeheadChin) : 0;
    // Positive = looking up, negative = looking down
    const pitch = Math.round(pitchRad * (180 / Math.PI));

    // 3. Calculate approximate Roll (lateral ear-to-shoulder tilt)
    const eyeDx = rightEye.x - leftEye.x;
    const eyeDy = rightEye.y - leftEye.y;
    const roll = Math.round(Math.atan2(eyeDy, eyeDx) * (180 / Math.PI));

    // 4. Centering in camera frame
    const centerX = (leftCheek.x + rightCheek.x) / 2;
    const centerY = (forehead.y + chin.y) / 2;
    this.sessionCenterPositions.push({ x: centerX, y: centerY });

    // Distance from ideal center (0.5, 0.5)
    const centerDist = Math.hypot(centerX - 0.5, centerY - 0.5);

    // 5. Face Scale / Distance from camera
    const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
    const faceHeight = Math.abs(chin.y - forehead.y);
    const faceScale = Math.hypot(faceWidth, faceHeight);

    // Compute defensible alignment score (0 - 100)
    let score = 100;

    // Yaw deduction (tolerance: ±12°)
    const absYaw = Math.abs(yaw);
    if (absYaw > 12) {
      score -= Math.min(30, (absYaw - 12) * 1.5);
    }

    // Pitch deduction (tolerance: ±12°)
    const absPitch = Math.abs(pitch);
    if (absPitch > 12) {
      score -= Math.min(25, (absPitch - 12) * 1.5);
    }

    // Roll deduction (tolerance: ±8°)
    const absRoll = Math.abs(roll);
    if (absRoll > 8) {
      score -= Math.min(20, (absRoll - 8) * 1.5);
    }

    // Centering deduction (tolerance: centerDist <= 0.12)
    if (centerDist > 0.12) {
      score -= Math.min(25, (centerDist - 0.12) * 80);
    }

    // Distance / scale deduction
    if (faceScale < 0.18) {
      score -= Math.min(15, (0.18 - faceScale) * 100);
    } else if (faceScale > 0.70) {
      score -= Math.min(15, (faceScale - 0.70) * 80);
    }

    // Keep score bounded within a practical 35 - 100% when face is detected
    const finalScore = Math.round(Math.max(35, Math.min(100, score)));
    this.sessionScores.push(finalScore);

    // Generate concise, neutral feedback tip (3-6 words)
    let feedback = "Good alignment and posture";
    if (centerDist > 0.20) {
      feedback = "Center face in camera view";
    } else if (absYaw > 20) {
      feedback = "Turn head toward camera";
    } else if (pitch < -18) {
      feedback = "Raise head toward camera";
    } else if (pitch > 18) {
      feedback = "Lower head slightly";
    } else if (absRoll > 12) {
      feedback = "Keep head level";
    } else if (faceScale < 0.18) {
      feedback = "Move closer to camera";
    } else if (faceScale > 0.70) {
      feedback = "Step back slightly from camera";
    }

    return {
      faceDetected: true,
      faceCount: 1,
      postureScore: finalScore,
      feedback,
      metrics: {
        yaw,
        pitch,
        roll,
        centerX: Number(centerX.toFixed(3)),
        centerY: Number(centerY.toFixed(3)),
        faceScale: Number(faceScale.toFixed(3)),
      },
    };
  }

  /**
   * Returns session-wide aggregate metrics for the completed interview.
   */
  public getSessionSummary(): SessionMetricsSummary {
    const totalFrames = this.sessionFrames;
    const faceFrames = this.sessionFaceFrames;
    const faceVisibilityRate = totalFrames > 0 ? Math.round((faceFrames / totalFrames) * 100) : 0;

    const validScores = this.sessionScores.filter((s) => s > 0);
    const averageAlignmentScore =
      validScores.length > 0
        ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
        : 0;

    // Head position stability (based on standard deviation of center positions)
    let stabilityScore = 85;
    if (this.sessionCenterPositions.length > 2) {
      const meanX =
        this.sessionCenterPositions.reduce((acc, p) => acc + p.x, 0) /
        this.sessionCenterPositions.length;
      const meanY =
        this.sessionCenterPositions.reduce((acc, p) => acc + p.y, 0) /
        this.sessionCenterPositions.length;
      const variance =
        this.sessionCenterPositions.reduce(
          (acc, p) => acc + Math.hypot(p.x - meanX, p.y - meanY) ** 2,
          0
        ) / this.sessionCenterPositions.length;
      const stdDev = Math.sqrt(variance);
      // Small stdDev (< 0.05) is very stable, large (> 0.20) indicates frequent shifting
      stabilityScore = Math.round(Math.max(40, Math.min(100, 100 - stdDev * 200)));
    }

    return {
      totalFramesAnalyzed: totalFrames,
      framesWithFace: faceFrames,
      faceVisibilityRate,
      averageAlignmentScore,
      multipleFacesCount: this.sessionMultipleFaces,
      stabilityScore,
    };
  }

  /**
   * Closes and disposes of MediaPipe resources.
   */
  public close(): void {
    if (this.landmarker) {
      try {
        if (typeof this.landmarker.close === "function") {
          this.landmarker.close();
        }
      } catch (err) {
        console.warn("Error closing MediaPipe FaceLandmarker:", err);
      }
      this.landmarker = null;
    }
    this.initPromise = null;
    this.isInitializing = false;
  }
}

// Singleton export
export const faceLandmarkerService = new FaceLandmarkerService();
