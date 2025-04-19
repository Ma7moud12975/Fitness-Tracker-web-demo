
import { Pose, calculateAngle, getKeypoint, calculateVerticalDistance, calculateHorizontalDistance } from './poseDetectionService';

// Exercise types supported by the app
export enum ExerciseType {
  SQUAT = 'squat',
  BICEP_CURL = 'bicepCurl',
  SHOULDER_PRESS = 'shoulderPress',
  NONE = 'none'
}

// State of a single exercise repetition
export enum RepState {
  STARTING = 'starting',
  UP = 'up',
  DOWN = 'down',
  COUNTING = 'counting',
  RESTING = 'resting',
  INCORRECT_FORM = 'incorrectForm'
}

// Interface for exercise settings
export interface ExerciseSettings {
  name: string;
  type: ExerciseType;
  targetReps: number;
  restBetweenSets: number; // in seconds
  sets: number;
  thresholds: {
    upAngle: number;
    downAngle: number;
    // Additional thresholds for form correctness
    backAngleMin?: number;
    backAngleMax?: number;
    kneePositionThreshold?: number;
  };
  formInstructions: string[];
  musclesTargeted: string[];
  primaryLandmarks: string[]; // Primary landmarks to track for this exercise
}

// Exercise definitions
export const EXERCISES: Record<ExerciseType, ExerciseSettings> = {
  [ExerciseType.SQUAT]: {
    name: 'Squat',
    type: ExerciseType.SQUAT,
    targetReps: 10,
    restBetweenSets: 60,
    sets: 3,
    thresholds: {
      upAngle: 170, // Hip angle when standing (knee near full extension)
      downAngle: 90, // Hip angle at bottom of squat (thigh parallel to ground)
      backAngleMin: 160, // Minimum angle for a straight back (avoid excessive forward lean)
      kneePositionThreshold: 30, // Threshold for knee position relative to ankle
    },
    formInstructions: [
      'Keep your back straight throughout the movement',
      'Knees should be aligned with toes, not collapsing inward',
      'Go down until thighs are parallel to the ground',
      'Maintain weight in your heels, not your toes'
    ],
    musclesTargeted: ['Quadriceps', 'Hamstrings', 'Glutes', 'Core'],
    primaryLandmarks: ['left_hip', 'left_knee', 'left_ankle', 'right_hip', 'right_knee', 'right_ankle', 'left_shoulder', 'right_shoulder']
  },
  [ExerciseType.BICEP_CURL]: {
    name: 'Bicep Curl',
    type: ExerciseType.BICEP_CURL,
    targetReps: 12,
    restBetweenSets: 45,
    sets: 3,
    thresholds: {
      upAngle: 45, // Elbow angle at top of curl (maximum flexion)
      downAngle: 160, // Elbow angle at bottom of curl (near full extension)
      backAngleMin: 165, // Keep back straight, no excessive leaning
    },
    formInstructions: [
      'Keep elbows close to your sides throughout the movement',
      'Minimize upper arm movement - isolate the bicep',
      'Curl up until forearms are nearly vertical',
      'Lower weights in a controlled motion to near full extension'
    ],
    musclesTargeted: ['Biceps', 'Forearms'],
    primaryLandmarks: ['left_shoulder', 'left_elbow', 'left_wrist', 'right_shoulder', 'right_elbow', 'right_wrist']
  },
  [ExerciseType.SHOULDER_PRESS]: {
    name: 'Shoulder Press',
    type: ExerciseType.SHOULDER_PRESS,
    targetReps: 10,
    restBetweenSets: 60,
    sets: 3,
    thresholds: {
      upAngle: 170, // Elbow angle at top of press (near full extension)
      downAngle: 90, // Elbow angle at bottom of press (starting position)
      backAngleMin: 165, // Avoid excessive back arching during the press
    },
    formInstructions: [
      'Keep your core engaged and back straight',
      'Press directly upward in a vertical path',
      'Lower weights under control to shoulder level',
      'Avoid excessive back arching during the press'
    ],
    musclesTargeted: ['Shoulders', 'Triceps', 'Upper back'],
    primaryLandmarks: ['left_shoulder', 'left_elbow', 'left_wrist', 'right_shoulder', 'right_elbow', 'right_wrist', 'left_hip', 'right_hip']
  },
  [ExerciseType.NONE]: {
    name: 'None',
    type: ExerciseType.NONE,
    targetReps: 0,
    restBetweenSets: 0,
    sets: 0,
    thresholds: {
      upAngle: 0,
      downAngle: 0,
    },
    formInstructions: [],
    musclesTargeted: [],
    primaryLandmarks: []
  }
};

// Interface for tracking exercise state
export interface ExerciseState {
  type: ExerciseType;
  repCount: number;
  setCount: number;
  repState: RepState;
  formFeedback: string[];
  lastRepTimestamp: number;
  formCorrect: boolean; // Track if current form is correct
  formIssues: Record<string, boolean>; // Track specific form issues by body part or issue type
  totalReps: number; // Total number of reps across all sets
  correctFormCount: number; // Count of reps performed with correct form
}

// Initialize a new exercise state
export function initExerciseState(type: ExerciseType): ExerciseState {
  return {
    type,
    repCount: 0,
    setCount: 1,
    repState: RepState.STARTING,
    formFeedback: [],
    lastRepTimestamp: Date.now(),
    formCorrect: true,
    formIssues: {},
    totalReps: 0,
    correctFormCount: 0
  };
}

// Process exercise state based on pose data
export function processExerciseState(
  currentState: ExerciseState,
  pose: Pose | null
): ExerciseState {
  if (!pose || currentState.type === ExerciseType.NONE) {
    return currentState;
  }
  
  // Clone the current state to avoid mutations
  const newState = { ...currentState };
  newState.formFeedback = []; // Clear previous feedback
  newState.formCorrect = true; // Start with assumption that form is correct
  newState.formIssues = {}; // Reset form issues
  
  const exerciseSettings = EXERCISES[currentState.type];
  
  // Exercise-specific logic
  switch (currentState.type) {
    case ExerciseType.SQUAT:
      return processSquat(newState, pose, exerciseSettings);
    
    case ExerciseType.BICEP_CURL:
      return processBicepCurl(newState, pose, exerciseSettings);
    
    case ExerciseType.SHOULDER_PRESS:
      return processShoulderPress(newState, pose, exerciseSettings);
    
    default:
      return newState;
  }
}

// Process squat exercise
function processSquat(
  state: ExerciseState,
  pose: Pose,
  settings: ExerciseSettings
): ExerciseState {
  // Get primary landmarks for squats
  const leftHip = getKeypoint(pose, 'left_hip');
  const leftKnee = getKeypoint(pose, 'left_knee');
  const leftAnkle = getKeypoint(pose, 'left_ankle');
  const leftShoulder = getKeypoint(pose, 'left_shoulder');
  
  if (!leftHip || !leftKnee || !leftAnkle || !leftShoulder) {
    state.formFeedback.push('Cannot detect legs and torso clearly');
    state.formCorrect = false;
    return state;
  }
  
  // Calculate key angles for squat form
  const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  
  // Check back alignment using shoulder-hip-knee angle
  const backAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
  
  // Log detailed analytics for debugging
  // console.log(`Squat - Knee Angle: ${kneeAngle.toFixed(1)}°, Back Angle: ${backAngle.toFixed(1)}°`);
  
  // Check if back is straight enough
  if (backAngle < (settings.thresholds.backAngleMin || 160)) {
    state.formFeedback.push('Keep your back straighter, avoid excessive forward lean');
    state.formCorrect = false;
    state.formIssues['left_shoulder'] = true;
    state.formIssues['right_shoulder'] = true;
    state.formIssues['left_hip'] = true;
    state.formIssues['right_hip'] = true;
  }
  
  // Knee position check - should be aligned with ankle/foot
  const kneeForwardPosition = leftKnee.x - leftAnkle.x;
  if (Math.abs(kneeForwardPosition) > (settings.thresholds.kneePositionThreshold || 30)) {
    state.formFeedback.push('Align your knees better with your ankles');
    state.formCorrect = false;
    state.formIssues['left_knee'] = true;
    state.formIssues['right_knee'] = true;
  }
  
  // If form is incorrect and we're not in INCORRECT_FORM state, transition to it
  if (!state.formCorrect && state.repState !== RepState.INCORRECT_FORM && 
      state.repState !== RepState.RESTING && state.repState !== RepState.STARTING) {
    state.repState = RepState.INCORRECT_FORM;
    state.formFeedback.push('Fix your form to continue counting reps');
    return state;
  }
  
  // If form was incorrect but is now fixed, return to appropriate state
  if (state.formCorrect && state.repState === RepState.INCORRECT_FORM) {
    // Determine if we should go back to UP or DOWN state based on knee angle
    state.repState = kneeAngle < settings.thresholds.downAngle ? RepState.DOWN : RepState.UP;
    state.formFeedback.push('Good form, continue your exercise');
  }
  
  // State machine for rep counting
  switch (state.repState) {
    case RepState.STARTING:
    case RepState.UP:
      if (kneeAngle < settings.thresholds.downAngle) {
        state.repState = RepState.DOWN;
      }
      break;
    
    case RepState.DOWN:
      if (kneeAngle > settings.thresholds.upAngle) {
        state.repState = RepState.UP;
        state.repCount += 1;
        state.totalReps += 1; // Increment total reps
        if (state.formCorrect) {
          state.correctFormCount += 1; // Increment correct form count
        }
        state.lastRepTimestamp = Date.now();
        
        // Check if set is complete
        if (state.repCount >= settings.targetReps) {
          state.setCount += 1;
          state.repCount = 0;
          state.repState = RepState.RESTING;
          
          if (state.setCount > settings.sets) {
            state.setCount = settings.sets;
            state.formFeedback.push('Workout complete! Great job!');
          } else {
            state.formFeedback.push(`Set ${state.setCount - 1} complete! Rest for ${settings.restBetweenSets} seconds.`);
          }
        }
      }
      break;
    
    case RepState.RESTING:
      // Check if rest period is over
      const restTime = (Date.now() - state.lastRepTimestamp) / 1000;
      if (restTime >= settings.restBetweenSets) {
        state.repState = RepState.STARTING;
        state.formFeedback.push(`Starting set ${state.setCount}`);
      } else {
        state.formFeedback.push(`Rest: ${Math.round(settings.restBetweenSets - restTime)}s remaining`);
      }
      break;
      
    case RepState.INCORRECT_FORM:
      // Already handled above
      break;
  }
  
  return state;
}

// Process bicep curl exercise
function processBicepCurl(
  state: ExerciseState,
  pose: Pose,
  settings: ExerciseSettings
): ExerciseState {
  // Focus on primary landmarks for bicep curls
  const rightShoulder = getKeypoint(pose, 'right_shoulder');
  const rightElbow = getKeypoint(pose, 'right_elbow');
  const rightWrist = getKeypoint(pose, 'right_wrist');
  
  if (!rightShoulder || !rightElbow || !rightWrist) {
    state.formFeedback.push('Cannot detect arms clearly');
    state.formCorrect = false;
    return state;
  }
  
  // Calculate key angles and measurements
  const elbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  
  // Check if elbow is stable relative to shoulder (minimize upper arm movement)
  const elbowHorizontalOffset = calculateHorizontalDistance(rightShoulder, rightElbow);
  const upperArmVertical = Math.abs(rightElbow.y - rightShoulder.y) / 
                          Math.sqrt(Math.pow(rightElbow.x - rightShoulder.x, 2) + Math.pow(rightElbow.y - rightShoulder.y, 2));
  
  // Log detailed analytics for debugging
  // console.log(`Bicep Curl - Elbow Angle: ${elbowAngle.toFixed(1)}°, Upper Arm Vertical: ${upperArmVertical.toFixed(2)}`);
  
  // Check elbow position - should be close to body
  if (elbowHorizontalOffset > 30) {
    state.formFeedback.push('Keep your elbows closer to your body');
    state.formCorrect = false;
    state.formIssues['right_elbow'] = true;
    state.formIssues['left_elbow'] = true;
  }
  
  // Check for excessive shoulder/upper arm movement
  if (upperArmVertical < 0.85) { // Upper arm should be fairly vertical
    state.formFeedback.push('Minimize shoulder movement, focus on elbow flexion');
    state.formCorrect = false;
    state.formIssues['right_shoulder'] = true;
    state.formIssues['left_shoulder'] = true;
  }
  
  // If form is incorrect and we're not in INCORRECT_FORM state, transition to it
  if (!state.formCorrect && state.repState !== RepState.INCORRECT_FORM && 
      state.repState !== RepState.RESTING && state.repState !== RepState.STARTING) {
    state.repState = RepState.INCORRECT_FORM;
    state.formFeedback.push('Fix your form to continue counting reps');
    return state;
  }
  
  // If form was incorrect but is now fixed, return to appropriate state
  if (state.formCorrect && state.repState === RepState.INCORRECT_FORM) {
    // Determine if we should go back to UP or DOWN state based on elbow angle
    state.repState = elbowAngle < settings.thresholds.upAngle ? RepState.UP : RepState.DOWN;
    state.formFeedback.push('Good form, continue your exercise');
  }
  
  // State machine for rep counting
  switch (state.repState) {
    case RepState.STARTING:
    case RepState.DOWN:
      if (elbowAngle < settings.thresholds.upAngle) {
        state.repState = RepState.UP;
      }
      break;
    
    case RepState.UP:
      if (elbowAngle > settings.thresholds.downAngle) {
        state.repState = RepState.DOWN;
        state.repCount += 1;
        state.totalReps += 1; // Increment total reps
        if (state.formCorrect) {
          state.correctFormCount += 1; // Increment correct form count
        }
        state.lastRepTimestamp = Date.now();
        
        // Check if set is complete
        if (state.repCount >= settings.targetReps) {
          state.setCount += 1;
          state.repCount = 0;
          state.repState = RepState.RESTING;
          
          if (state.setCount > settings.sets) {
            state.setCount = settings.sets;
            state.formFeedback.push('Workout complete! Great job!');
          } else {
            state.formFeedback.push(`Set ${state.setCount - 1} complete! Rest for ${settings.restBetweenSets} seconds.`);
          }
        }
      }
      break;
    
    case RepState.RESTING:
      // Check if rest period is over
      const restTime = (Date.now() - state.lastRepTimestamp) / 1000;
      if (restTime >= settings.restBetweenSets) {
        state.repState = RepState.STARTING;
        state.formFeedback.push(`Starting set ${state.setCount}`);
      } else {
        state.formFeedback.push(`Rest: ${Math.round(settings.restBetweenSets - restTime)}s remaining`);
      }
      break;
      
    case RepState.INCORRECT_FORM:
      // Already handled above
      break;
  }
  
  return state;
}

// Process shoulder press exercise
function processShoulderPress(
  state: ExerciseState,
  pose: Pose,
  settings: ExerciseSettings
): ExerciseState {
  // Focus on primary landmarks for shoulder press
  const rightShoulder = getKeypoint(pose, 'right_shoulder');
  const rightElbow = getKeypoint(pose, 'right_elbow');
  const rightWrist = getKeypoint(pose, 'right_wrist');
  const rightHip = getKeypoint(pose, 'right_hip');
  
  if (!rightShoulder || !rightElbow || !rightWrist || !rightHip) {
    state.formFeedback.push('Cannot detect arms and torso clearly');
    state.formCorrect = false;
    return state;
  }
  
  // Calculate key angles and measurements
  const elbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  const wristVerticalPosition = calculateVerticalDistance(rightWrist, rightShoulder);
  
  // Check back angle (should remain upright, not arch backward)
  const backAngle = calculateAngle(rightShoulder, rightHip, { x: rightHip.x, y: rightHip.y - 100 }); // Vertical reference
  const isBackArching = backAngle < (settings.thresholds.backAngleMin || 165);
  
  // Log detailed analytics for debugging
  // console.log(`Shoulder Press - Elbow Angle: ${elbowAngle.toFixed(1)}°, Back Angle: ${backAngle.toFixed(1)}°, Wrist Vertical: ${wristVerticalPosition}`);
  
  // Check for back arching
  if (isBackArching) {
    state.formFeedback.push('Avoid arching your back, keep your core engaged');
    state.formCorrect = false;
    state.formIssues['right_hip'] = true;
    state.formIssues['left_hip'] = true;
  }
  
  // Check for vertical path of the press
  const wristHorizontalOffset = Math.abs(rightWrist.x - rightShoulder.x);
  if (wristHorizontalOffset > 40 && wristVerticalPosition < -50) { // Check only when arms are raised
    state.formFeedback.push('Press directly upward, maintain a vertical path');
    state.formCorrect = false;
    state.formIssues['right_wrist'] = true;
    state.formIssues['left_wrist'] = true;
  }
  
  // If form is incorrect and we're not in INCORRECT_FORM state, transition to it
  if (!state.formCorrect && state.repState !== RepState.INCORRECT_FORM && 
      state.repState !== RepState.RESTING && state.repState !== RepState.STARTING) {
    state.repState = RepState.INCORRECT_FORM;
    state.formFeedback.push('Fix your form to continue counting reps');
    return state;
  }
  
  // If form was incorrect but is now fixed, return to appropriate state
  if (state.formCorrect && state.repState === RepState.INCORRECT_FORM) {
    // Determine if we should go back to UP or DOWN state based on wrist position
    state.repState = wristVerticalPosition < -100 ? RepState.UP : RepState.DOWN;
    state.formFeedback.push('Good form, continue your exercise');
  }
  
  // State machine for rep counting
  switch (state.repState) {
    case RepState.STARTING:
    case RepState.DOWN:
      if (elbowAngle > settings.thresholds.upAngle && wristVerticalPosition < -100) {
        state.repState = RepState.UP;
      }
      break;
    
    case RepState.UP:
      if (elbowAngle < settings.thresholds.downAngle && wristVerticalPosition > -50) {
        state.repState = RepState.DOWN;
        state.repCount += 1;
        state.totalReps += 1; // Increment total reps
        if (state.formCorrect) {
          state.correctFormCount += 1; // Increment correct form count
        }
        state.lastRepTimestamp = Date.now();
        
        // Check if set is complete
        if (state.repCount >= settings.targetReps) {
          state.setCount += 1;
          state.repCount = 0;
          state.repState = RepState.RESTING;
          
          if (state.setCount > settings.sets) {
            state.setCount = settings.sets;
            state.formFeedback.push('Workout complete! Great job!');
          } else {
            state.formFeedback.push(`Set ${state.setCount - 1} complete! Rest for ${settings.restBetweenSets} seconds.`);
          }
        }
      }
      break;
    
    case RepState.RESTING:
      // Check if rest period is over
      const restTime = (Date.now() - state.lastRepTimestamp) / 1000;
      if (restTime >= settings.restBetweenSets) {
        state.repState = RepState.STARTING;
        state.formFeedback.push(`Starting set ${state.setCount}`);
      } else {
        state.formFeedback.push(`Rest: ${Math.round(settings.restBetweenSets - restTime)}s remaining`);
      }
      break;
      
    case RepState.INCORRECT_FORM:
      // Already handled above
      break;
  }
  
  return state;
}
