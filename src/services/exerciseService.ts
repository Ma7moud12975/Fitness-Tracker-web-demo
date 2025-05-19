import { Pose, calculateAngle, getKeypoint, calculateVerticalDistance, calculateHorizontalDistance } from './poseDetectionService';

// Exercise types supported by the app
export enum ExerciseType {
  SQUAT = 'squat',
  BICEP_CURL = 'bicepCurl',
  // SHOULDER_PRESS = 'shoulderPress', // Removed
  PUSH_UP = 'pushUp', // Added
  PULL_UP = 'pullUp', // Added
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
    backAngleMax?: number; // Added
    kneePositionThreshold?: number;
    upperArmMovementMax?: number; // Added for Bicep Curl
    kneeValgusCheck?: boolean; // Added for Squat
    chestForwardCheck?: boolean; // Added for Squat
    bodyLineAngleRange?: [number, number]; // Added for Push Up
    chinAboveWristRequired?: boolean; // Added for Pull Up
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
    targetReps: 15, // Example value
    restBetweenSets: 10, // Example value
    sets: 3, // Example value
    thresholds: {
      upAngle: 155, // Elbow angle when arms are extended
      downAngle: 95, // Elbow angle when chest is near floor
      bodyLineAngleRange: [150, 190], // Added - Max back angle deviation allowed
      // Added - Check for excessive chest forward lean
    },
    formInstructions: [
      'Keep your back straight, chest up',
      'Lower until thighs are at least parallel to the ground (knee angle <= 100°)',
      'Ensure knees track over toes, not caving inward',
      'Maintain weight primarily in heels/midfoot'
    ],
    musclesTargeted: ['Quadriceps', 'Hamstrings', 'Glutes', 'Core'],
    primaryLandmarks: ['left_hip', 'left_knee', 'left_ankle', 'right_hip', 'right_knee', 'right_ankle', 'left_shoulder', 'right_shoulder']
  },
  [ExerciseType.BICEP_CURL]: {
    name: 'Bicep Curl',
    type: ExerciseType.BICEP_CURL,
    targetReps: 12, // Default, can be adjusted
    restBetweenSets: 10, // Default, can be adjusted
    sets: 3, // Default, can be adjusted
    thresholds: {
      upAngle: 70, // Changed from 55 to be more lenient
      downAngle: 140, // Changed from 160 to be more lenient
      backAngleMax: 20, // Added - Max back angle deviation allowed
      upperArmMovementMax: 200, // Added - Max upper arm movement allowed
    },
    formInstructions: [
      'Keep elbows tucked close to your sides',
      'Minimize upper arm movement; isolate the bicep',
      'Curl weight up towards shoulder (elbow angle ~55°)',
      'Lower weight slowly until arms are nearly straight (elbow angle ~155°)'
    ],
    musclesTargeted: ['Biceps', 'Forearms'],
    primaryLandmarks: ['left_shoulder', 'left_elbow', 'left_wrist', 'right_shoulder', 'right_elbow', 'right_wrist']
  },
  // [ExerciseType.SHOULDER_PRESS]: { ... } // Removed
  [ExerciseType.PUSH_UP]: {
    name: 'Push Up',
    type: ExerciseType.PUSH_UP,
    targetReps: 15, // Example value
    restBetweenSets: 10, // Example value
    sets: 3, // Example value
    thresholds: {
      upAngle: 130, // Changed from 140 - more lenient for extended arms
      downAngle: 100, // Changed from 110 - more lenient for bent arms
      bodyLineAngleRange: [130, 210], // Widened from [140, 200]
    },
    formInstructions: [
      'Place hands slightly wider than shoulder-width',
      'Keep body in a straight line from head to heels',
      'Lower chest towards the floor (elbow angle ~95°)',
      'Push back up until arms are extended (elbow angle ~155°)',
    ],
    musclesTargeted: ['Chest', 'Shoulders', 'Triceps', 'Core'],
    primaryLandmarks: ['left_shoulder', 'left_elbow', 'left_wrist', 'right_shoulder', 'right_elbow', 'right_wrist', 'left_hip', 'right_hip', 'left_knee', 'right_knee']
  },
  [ExerciseType.PULL_UP]: {
    name: 'Pull Up',
    type: ExerciseType.PULL_UP,
    targetReps: 15, // Example value
    restBetweenSets: 10, // Example value
    sets: 3, // Example value
    thresholds: {
      upAngle: 100, // Elbow angle when arms are extended
      downAngle: 95, // Elbow angle when chest is near floor
      bodyLineAngleRange: [150, 190], // Require chin to clear bar height
    },
    formInstructions: [
      'Grip bar slightly wider than shoulder-width, palms facing away',
      'Hang with arms fully extended',
      'Pull body up until chin is above the bar (elbow angle ~80°)',
      'Lower body slowly until arms are fully extended (elbow angle ~160°)',
      'Avoid excessive swinging or kipping',
    ],
    musclesTargeted: ['Back (Lats)', 'Biceps', 'Shoulders', 'Core'],
    primaryLandmarks: ['left_shoulder', 'left_elbow', 'left_wrist', 'right_shoulder', 'right_elbow', 'right_wrist', 'nose'] // Nose/wrist relation for chin check
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
    setCount: 0, // <-- Change this from 1 to 0
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
  pose: Pose | null,
  userSettings?: Partial<ExerciseSettings>
): ExerciseState {
  // Add debug log at the very top
  console.log('processExerciseState called:', {
    exerciseType: currentState.type,
    poseDetected: !!pose,
    currentRepState: currentState.repState,
    currentRepCount: currentState.repCount
  });
  
  if (!pose || currentState.type === ExerciseType.NONE) {
    return currentState;
  }
  
  // Clone the current state to avoid mutations
  const newState = { ...currentState };
  newState.formFeedback = []; // Clear previous feedback
  newState.formCorrect = true; // Start with assumption that form is correct
  newState.formIssues = {}; // Reset form issues
  
  // Use userSettings to override EXERCISES defaults
  const exerciseSettings = {
    ...EXERCISES[currentState.type],
    ...userSettings,
  };
  
  // Exercise-specific logic
  switch (currentState.type) {
    case ExerciseType.SQUAT:
      return processSquat(newState, pose, exerciseSettings);
    
    case ExerciseType.BICEP_CURL:
      return processBicepCurl(newState, pose, exerciseSettings);
    
    case ExerciseType.PUSH_UP:
      return processPushUp(newState, pose, exerciseSettings);

    case ExerciseType.PULL_UP:
      return processPullUp(newState, pose, exerciseSettings);
    
    default:
      return newState;
  }
}

// Helper function to play sound
function playRepSound() {
  const audio = new Audio('/pop.wav'); // Assuming pop.wav is in the public folder or accessible via root
  audio.play().catch(error => console.warn('Error playing sound:', error));
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
  const rightHip = getKeypoint(pose, 'right_hip');
  const rightKnee = getKeypoint(pose, 'right_knee');
  const rightAnkle = getKeypoint(pose, 'right_ankle');
  const rightShoulder = getKeypoint(pose, 'right_shoulder');

  if (!leftHip || !leftKnee || !leftAnkle || !leftShoulder || !rightHip || !rightKnee || !rightAnkle || !rightShoulder) {
    state.formFeedback.push('Cannot detect legs and torso clearly');
    state.formCorrect = false;
    return state;
  }

  // Calculate key angles for squat form (average of both sides)
  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  const kneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

  // Calculate back angle relative to vertical (average of both sides)
  const leftBackAngleVertical = calculateAngle(leftShoulder, leftHip, { x: leftHip.x, y: leftHip.y + 100 }); // Angle with vertical line down
  const rightBackAngleVertical = calculateAngle(rightShoulder, rightHip, { x: rightHip.x, y: rightHip.y + 100 });
  const backAngleDeviation = ( (180 - leftBackAngleVertical) + (180 - rightBackAngleVertical) ) / 2; // Deviation from straight up (0 degrees)

  // Log detailed analytics for debugging
  // console.log(`Squat - Avg Knee Angle: ${kneeAngle.toFixed(1)}°, Avg Back Deviation: ${backAngleDeviation.toFixed(1)}°`);

  // Reset form correctness for this frame
  state.formCorrect = true;
  state.formFeedback = [];
  state.formIssues = {}; // Clear previous issues

  // Check if back is straight enough (deviation from vertical)
  if (backAngleDeviation > (settings.thresholds.backAngleMax || 45)) {
    state.formFeedback.push(`Keep your back straighter. Angle: ${backAngleDeviation.toFixed(0)}° (Max: ${settings.thresholds.backAngleMax || 45}°)`);
    state.formCorrect = false;
    state.formIssues['left_hip'] = true;
    state.formIssues['right_hip'] = true;
    state.formIssues['left_shoulder'] = true;
    state.formIssues['right_shoulder'] = true;
  }

  // Knee Valgus Check (knees caving in/out)
  if (settings.thresholds.kneeValgusCheck) {
    const leftKneeValgus = leftKnee.x < leftAnkle.x - 0.05 * Math.abs(leftHip.y - leftAnkle.y); // Knee significantly inside ankle
    const rightKneeValgus = rightKnee.x > rightAnkle.x + 0.05 * Math.abs(rightHip.y - rightAnkle.y); // Knee significantly outside ankle

    if (leftKneeValgus) {
      state.formFeedback.push('Left knee caving in. Push it outwards.');
      state.formCorrect = false;
      state.formIssues['left_knee'] = true;
    }
    if (rightKneeValgus) {
      state.formFeedback.push('Right knee moving outwards too much.'); // Or adjust message based on desired form
      state.formCorrect = false;
      state.formIssues['right_knee'] = true;
    }
  }

  // Chest Forward Lean Check (Shoulder X relative to Knee X in down phase)
  if (settings.thresholds.chestForwardCheck && state.repState === RepState.DOWN) {
      const leftChestLean = leftShoulder.x < leftKnee.x - 0.1 * Math.abs(leftShoulder.y - leftKnee.y); // Shoulder significantly behind knee
      const rightChestLean = rightShoulder.x < rightKnee.x - 0.1 * Math.abs(rightShoulder.y - rightKnee.y);
      if (leftChestLean || rightChestLean) {
          state.formFeedback.push('Keep chest up, avoid excessive forward lean.');
          state.formCorrect = false;
          state.formIssues['left_shoulder'] = true;
          state.formIssues['right_shoulder'] = true;
      }
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

  // State machine for rep counting (only proceed if not in INCORRECT_FORM)
  if (state.repState !== RepState.INCORRECT_FORM) {
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
            playRepSound(); // Play sound on rep count
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

        case RepState.RESTING: {
          // Check if rest period is over
          const restTime = (Date.now() - state.lastRepTimestamp) / 1000;
          if (restTime >= settings.restBetweenSets) {
            state.repState = RepState.STARTING;
            state.formFeedback.push(`Starting set ${state.setCount}`);
          } else {
            state.formFeedback.push(`Rest: ${Math.round(settings.restBetweenSets - restTime)}s remaining`);
          }
          break;
        }

        // case RepState.INCORRECT_FORM: // Handled above
        //   break;
      }
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
  const leftShoulder = getKeypoint(pose, 'left_shoulder');
  const leftElbow = getKeypoint(pose, 'left_elbow');
  const leftWrist = getKeypoint(pose, 'left_wrist');
  const leftHip = getKeypoint(pose, 'left_hip');
  const rightShoulder = getKeypoint(pose, 'right_shoulder');
  const rightElbow = getKeypoint(pose, 'right_elbow');
  const rightWrist = getKeypoint(pose, 'right_wrist');
  const rightHip = getKeypoint(pose, 'right_hip');

  if (!leftShoulder || !leftElbow || !leftWrist || !leftHip || !rightShoulder || !rightElbow || !rightWrist || !rightHip) {
    state.formFeedback.push('Cannot detect arms and torso clearly');
    state.formCorrect = false;
    return state;
  }

  // Calculate key angles and measurements (average)
  const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  const elbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

  // Calculate back angle relative to vertical (average)
  const leftBackAngleVertical = calculateAngle(leftShoulder, leftHip, { x: leftHip.x, y: leftHip.y + 100 });
  const rightBackAngleVertical = calculateAngle(rightShoulder, rightHip, { x: rightHip.x, y: rightHip.y + 100 });
  const backAngleDeviation = ( (180 - leftBackAngleVertical) + (180 - rightBackAngleVertical) ) / 2; // Deviation from straight up

  // Calculate upper arm movement (deviation from vertical)
  const leftUpperArmAngleVertical = calculateAngle(leftElbow, leftShoulder, { x: leftShoulder.x, y: leftShoulder.y + 100 });
  const rightUpperArmAngleVertical = calculateAngle(rightElbow, rightShoulder, { x: rightShoulder.x, y: rightShoulder.y + 100 });
  const upperArmDeviation = ( (180 - leftUpperArmAngleVertical) + (180 - rightUpperArmAngleVertical) ) / 2;

  // Log detailed analytics for debugging
  // console.log(`Bicep Curl - Avg Elbow Angle: ${elbowAngle.toFixed(1)}°, Avg Back Dev: ${backAngleDeviation.toFixed(1)}°, Avg Upper Arm Dev: ${upperArmDeviation.toFixed(1)}°`);

  // Reset form correctness for this frame
  state.formCorrect = true;
  state.formFeedback = [];
  state.formIssues = {}; // Clear previous issues

  // Check back angle deviation
  if (backAngleDeviation > (settings.thresholds.backAngleMax || 20)) {
    state.formFeedback.push(`Keep your back straight. Angle: ${backAngleDeviation.toFixed(0)}° (Max: ${settings.thresholds.backAngleMax || 20}°)`);
    state.formCorrect = false;
    state.formIssues['left_hip'] = true;
    state.formIssues['right_hip'] = true;
  }

  // Check for excessive upper arm movement (deviation from vertical)
  if (upperArmDeviation > (settings.thresholds.upperArmMovementMax || 25)) {
    state.formFeedback.push(`Keep upper arms still. Movement: ${upperArmDeviation.toFixed(0)}° (Max: ${settings.thresholds.upperArmMovementMax || 25}°)`);
    state.formCorrect = false;
    state.formIssues['left_shoulder'] = true;
    state.formIssues['right_shoulder'] = true;
    state.formIssues['left_elbow'] = true;
    state.formIssues['right_elbow'] = true;
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
    console.log('BicepCurl Detailed Debug:', {
      elbowAngle: elbowAngle.toFixed(1),
      upThreshold: settings.thresholds.upAngle,
      downThreshold: settings.thresholds.downAngle,
      repState: state.repState,
      repCount: state.repCount,
      isUpConditionMet: elbowAngle < settings.thresholds.upAngle,
      isDownConditionMet: elbowAngle > settings.thresholds.downAngle
    });
  }

  // State machine for rep counting (only proceed if not in INCORRECT_FORM)
  if (state.repState !== RepState.INCORRECT_FORM) {
      // Inside processBicepCurl function, in the state machine section
      switch (state.repState) {
        case RepState.STARTING:
        case RepState.DOWN:
          if (elbowAngle < settings.thresholds.upAngle) {
            console.log('STATE TRANSITION: DOWN -> UP', { elbowAngle });
            state.repState = RepState.UP;
          }
          break;
      
        case RepState.UP:
          if (elbowAngle > settings.thresholds.downAngle) {
            console.log('STATE TRANSITION: UP -> DOWN, COUNTING REP', { elbowAngle });
            state.repState = RepState.DOWN;
            state.repCount += 1;
            state.totalReps += 1;
            playRepSound(); // Play sound on rep count
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

        case RepState.RESTING: {
          // Check if rest period is over
          const restTime = (Date.now() - state.lastRepTimestamp) / 1000;
          if (restTime >= settings.restBetweenSets) {
            state.repState = RepState.STARTING;
            state.formFeedback.push(`Starting set ${state.setCount}`);
          } else {
            state.formFeedback.push(`Rest: ${Math.round(settings.restBetweenSets - restTime)}s remaining`);
          }
          break;
        }

        // case RepState.INCORRECT_FORM: // Handled above
        //   break;
      }
  }

  return state;
}

// Process push up exercise
function processPushUp(state: ExerciseState, pose: Pose, settings: ExerciseSettings): ExerciseState {
  // Get required landmarks
  const leftShoulder = getKeypoint(pose, 'left_shoulder');
  const leftElbow = getKeypoint(pose, 'left_elbow');
  const leftWrist = getKeypoint(pose, 'left_wrist');
  const rightShoulder = getKeypoint(pose, 'right_shoulder');
  const rightElbow = getKeypoint(pose, 'right_elbow');
  const rightWrist = getKeypoint(pose, 'right_wrist');
  const leftHip = getKeypoint(pose, 'left_hip');
  const rightHip = getKeypoint(pose, 'right_hip');
  const leftKnee = getKeypoint(pose, 'left_knee');
  const rightKnee = getKeypoint(pose, 'right_knee');

  if (!leftShoulder || !leftElbow || !leftWrist || !rightShoulder || !rightElbow || !rightWrist || !leftHip || !rightHip || !leftKnee || !rightKnee) {
    state.formFeedback.push('Cannot detect all required landmarks');
    state.formCorrect = false;
    return state;
  }

  // Calculate average elbow angle
  const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  const elbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

  // Calculate body alignment (shoulder-hip-knee)
  const leftBodyLine = calculateAngle(leftShoulder, leftHip, leftKnee);
  const rightBodyLine = calculateAngle(rightShoulder, rightHip, rightKnee);
  const bodyLineAngle = (leftBodyLine + rightBodyLine) / 2;

  // Form check: body alignment
  if (bodyLineAngle < 150 || bodyLineAngle > 190) {
    state.formFeedback.push('Body alignment off');
    state.formCorrect = false;
  }

  // State machine
  switch (state.repState) {
    case RepState.STARTING:
    case RepState.UP:
      if (elbowAngle < 145) {
        state.repState = RepState.DOWN;
      }
      break;
    case RepState.DOWN:
      if (elbowAngle > 155) {
        state.repState = RepState.UP;
        // Rep counted on transition down→up
        state.repCount += 1;
        state.totalReps += 1;
        playRepSound(); // Play sound on rep count
        if (state.formCorrect) {
          state.correctFormCount += 1;
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
case RepState.RESTING: {
  // Check if rest period is over
  const restTime = (Date.now() - state.lastRepTimestamp) / 1000;
  if (restTime >= settings.restBetweenSets) {
    state.repState = RepState.STARTING;
    state.formFeedback.push(`Starting set ${state.setCount}`);
  } else {
    state.formFeedback.push(`Rest: ${Math.round(settings.restBetweenSets - restTime)}s remaining`);
  }
  break;
}
    case RepState.INCORRECT_FORM:
      // Already handled above
      break;
  }
  return state;
}

// Process pull up exercise
function processPullUp(
  state: ExerciseState,
  pose: Pose,
  settings: ExerciseSettings
): ExerciseState {
  // Get landmarks for both sides and nose
  const leftShoulder = getKeypoint(pose, 'left_shoulder');
  const leftElbow = getKeypoint(pose, 'left_elbow');
  const leftWrist = getKeypoint(pose, 'left_wrist');
  const rightShoulder = getKeypoint(pose, 'right_shoulder');
  const rightElbow = getKeypoint(pose, 'right_elbow');
  const rightWrist = getKeypoint(pose, 'right_wrist');
  const nose = getKeypoint(pose, 'nose');

  if (!leftShoulder || !leftElbow || !leftWrist || !rightShoulder || !rightElbow || !rightWrist || !nose) {
    state.formFeedback.push('Cannot detect arms and head clearly');
    state.formCorrect = false;
    return state;
  }

  // Calculate average elbow angle
  const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  const elbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

  // Calculate average wrist Y position
  const avgWristY = (leftWrist.y + rightWrist.y) / 2;

  // Form Checks
  state.formCorrect = true;
  state.formIssues = {};

  // Check chin position relative to average wrist height in the 'DOWN' state (top of pull-up)
  const chinAboveWrist = nose.y < avgWristY; // Lower Y value means higher on screen
  if (settings.thresholds.chinAboveWristRequired && state.repState === RepState.DOWN && !chinAboveWrist) {
      state.formFeedback.push('Pull higher - Chin needs to clear the bar (hands)');
      state.formCorrect = false;
      state.formIssues['nose'] = true;
      state.formIssues['left_wrist'] = true;
      state.formIssues['right_wrist'] = true;
  }

  // If form is incorrect, transition to INCORRECT_FORM state
  if (!state.formCorrect && state.repState !== RepState.INCORRECT_FORM &&
      state.repState !== RepState.RESTING && state.repState !== RepState.STARTING) {
    state.repState = RepState.INCORRECT_FORM;
    state.formFeedback.push('Fix your form to continue counting reps');
    return state;
  }

  // If form was incorrect but is now fixed, return to appropriate state
  if (state.formCorrect && state.repState === RepState.INCORRECT_FORM) {
    // If chin is now above wrist (or check not required) and angle is appropriate for DOWN state
    if ((chinAboveWrist || !settings.thresholds.chinAboveWristRequired) && elbowAngle < settings.thresholds.downAngle) {
        state.repState = RepState.DOWN;
    } else {
        state.repState = RepState.UP; // Otherwise assume UP state (extended)
    }
    state.formFeedback.push('Good form, continue your exercise');
  }

  // State machine for rep counting (Count on DOWN_TO_UP transition)
  // Note: UP state = arms extended (angle > upAngle threshold)
  //       DOWN state = arms contracted (angle < downAngle threshold)
  switch (state.repState) {
    case RepState.STARTING:
    case RepState.UP: // Arms extended (bottom)
      if (elbowAngle < settings.thresholds.downAngle) { // Start pulling up
          // Check chin position upon entering DOWN state if required
          if (settings.thresholds.chinAboveWristRequired && !(nose.y < avgWristY)) {
              state.formFeedback.push('Pull higher - Chin needs to clear the bar (hands)');
              state.formCorrect = false;
              state.formIssues['nose'] = true;
              state.formIssues['left_wrist'] = true;
              state.formIssues['right_wrist'] = true;
              state.repState = RepState.INCORRECT_FORM;
          } else {
              state.repState = RepState.DOWN;
          }
      }
      break;

    case RepState.DOWN: // Arms contracted (top)
      if (elbowAngle > settings.thresholds.upAngle) { // Start lowering, complete rep
        state.repState = RepState.UP;
        state.repCount += 1;
        state.totalReps += 1;
        playRepSound(); // Play sound on rep count
        if (state.formCorrect) {
          state.correctFormCount += 1;
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

    case RepState.RESTING: {
      const restTime = (Date.now() - state.lastRepTimestamp) / 1000;
      if (restTime >= settings.restBetweenSets) {
        state.repState = RepState.STARTING;
        state.formFeedback.push(`Starting set ${state.setCount}`);
      } else {
        state.formFeedback.push(`Rest: ${Math.round(settings.restBetweenSets - restTime)}s remaining`);
      }
      break;
    }

    case RepState.INCORRECT_FORM:
      // Already handled above
      break;
  }

  return state;
}
