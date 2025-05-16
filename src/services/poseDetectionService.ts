
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { initializeTensorFlow } from './tensorflowService';

// We'll use MovenetSinglePose model for real-time performance
let detector: poseDetection.PoseDetector | null = null;

export interface PoseKeypoint {
  name: string;
  x: number;
  y: number;
  score: number;
}

export interface Pose {
  keypoints: PoseKeypoint[];
  score: number;
}

// Map keypoint indices to their names for easier reference
export const KEYPOINT_NAMES = [
  'nose',
  'left_eye', 'right_eye',
  'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder',
  'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist',
  'left_hip', 'right_hip',
  'left_knee', 'right_knee',
  'left_ankle', 'right_ankle'
];

// Initialize the pose detector
export async function initPoseDetector(): Promise<void> {
  if (detector) return;
  
  try {
    // Initialize TensorFlow.js first
    await initializeTensorFlow();
    
    const model = poseDetection.SupportedModels.MoveNet;
    const detectorConfig = {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      enableSmoothing: true,
      minPoseScore: 0.25,
    };
    
    detector = await poseDetection.createDetector(model, detectorConfig);
    console.log('Pose detector initialized successfully');
  } catch (error) {
    console.error('Failed to initialize pose detector:', error);
    throw new Error('Could not initialize pose detection model');
  }
}

// Detect poses in an image
export async function detectPose(
  image: ImageData | HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<Pose | null> {
  if (!detector) {
    console.warn('Pose detector not initialized');
    return null;
  }
  
  try {
    const poses = await detector.estimatePoses(image);
    
    if (poses.length === 0) return null;
    
    // Convert to our Pose interface with named keypoints
    const pose = poses[0];
    const keypoints = pose.keypoints.map((kp, i) => ({
      name: KEYPOINT_NAMES[i] || `keypoint_${i}`,
      x: kp.x,
      y: kp.y,
      score: kp.score || 0
    }));
    
    return {
      keypoints,
      score: pose.score || 0
    };
  } catch (error) {
    console.error('Error detecting pose:', error);
    return null;
  }
}

// Calculate angle between three points (in degrees)
export function calculateAngle(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): number {
  const angleRadians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - 
                       Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angleDegrees = angleRadians * (180 / Math.PI);
  
  // Ensure angle is positive
  if (angleDegrees < 0) {
    angleDegrees += 360;
  }
  
  // Normalize to 0-180 degrees
  if (angleDegrees > 180) {
    angleDegrees = 360 - angleDegrees;
  }
  
  return angleDegrees;
}

// Get a specific keypoint from a pose
export function getKeypoint(pose: Pose | null, name: string): PoseKeypoint | null {
  if (!pose) return null;
  return pose.keypoints.find(kp => kp.name === name) || null;
}

// Calculate vertical distance between two points (positive means p1 is above p2)
export function calculateVerticalDistance(p1: PoseKeypoint, p2: PoseKeypoint): number {
  return p2.y - p1.y;
}

// Calculate horizontal distance between two points
export function calculateHorizontalDistance(p1: PoseKeypoint, p2: PoseKeypoint): number {
  return p2.x - p1.x;
}

// Add new interface for drawing options with enhanced features for primary landmarks
export interface DrawPoseOptions {
  isCorrectForm?: boolean;
  exerciseType?: string;
  primaryLandmarks?: string[]; // List of primary landmarks to highlight
  formErrors?: Record<string, boolean>; // Individual form issues by body part
}

// Update the drawPose function to accept enhanced options
export function drawPose(
  ctx: CanvasRenderingContext2D, 
  pose: Pose,
  options: DrawPoseOptions = {},
  minConfidence: number = 0.3
): void {
  if (!pose) return;

  // Define base colors
  const correctColor = 'rgba(34, 197, 94, 0.8)';  // green
  const incorrectColor = 'rgba(239, 68, 68, 0.8)'; // red
  const neutralColor = 'rgba(155, 135, 245, 0.8)'; // purple
  
  // Define colors based on form correctness
  const skeletonColor = options.isCorrectForm !== undefined
    ? options.isCorrectForm 
      ? correctColor  
      : incorrectColor
    : neutralColor;

  // Define connections between keypoints for drawing skeleton
  const connections = [
    ['nose', 'left_eye'], ['nose', 'right_eye'],
    ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'], ['right_shoulder', 'right_elbow'],
    ['left_elbow', 'left_wrist'], ['right_elbow', 'right_wrist'],
    ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
    ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle']
  ];

  // Create a lookup map of keypoints by name
  const keypointMap = new Map<string, PoseKeypoint>();
  pose.keypoints.forEach(kp => {
    keypointMap.set(kp.name, kp);
  });

  // Draw connections
  ctx.lineWidth = 3;
  
  connections.forEach(([p1Name, p2Name]) => {
    const p1 = keypointMap.get(p1Name);
    const p2 = keypointMap.get(p2Name);
    
    if (p1 && p2 && p1.score > minConfidence && p2.score > minConfidence) {
      // Determine if this connection is part of a primary landmark
      const isPrimaryConnection = options.primaryLandmarks && 
        (options.primaryLandmarks.includes(p1Name) && options.primaryLandmarks.includes(p2Name));
      
      // Choose connection color based on importance and correctness
      let connectionColor = skeletonColor;
      
      // If we have specific form errors and this connection is relevant to one of them
      if (options.formErrors && (options.formErrors[p1Name] || options.formErrors[p2Name])) {
        connectionColor = incorrectColor;
      } else if (isPrimaryConnection) {
        // Highlight primary connections more vividly
        connectionColor = options.isCorrectForm ? correctColor : incorrectColor;
      }
      
      ctx.strokeStyle = connectionColor;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  });

  // Draw keypoints with varying sizes and colors based on importance
  pose.keypoints.forEach(keypoint => {
    if (keypoint.score > minConfidence) {
      const { x, y, name } = keypoint;
      
      // Determine if this is a primary landmark
      const isPrimary = options.primaryLandmarks && options.primaryLandmarks.includes(name);
      
      // Choose point color and size based on importance and form
      let pointColor = skeletonColor;
      let pointSize = 5;
      
      // If specific form errors are provided
      if (options.formErrors && options.formErrors[name]) {
        pointColor = incorrectColor;
        pointSize = 7; // Larger for error points
      } else if (isPrimary) {
        // Primary landmarks are larger and colored based on form
        pointColor = options.isCorrectForm ? correctColor : incorrectColor;
        pointSize = 7;
      }
      
      ctx.beginPath();
      ctx.arc(x, y, pointSize, 0, 2 * Math.PI);
      ctx.fillStyle = pointColor;
      ctx.fill();
      
      // Add a stroke around primary landmarks for visibility
      if (isPrimary) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  });
}