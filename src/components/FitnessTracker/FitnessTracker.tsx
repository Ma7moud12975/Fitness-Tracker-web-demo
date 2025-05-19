import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import WebcamView from "./WebcamView";
import ExerciseStats from "./ExerciseStats";
import FormGuide from "./FormGuide";
import ExerciseDemoModal from "./ExerciseDemoModal";
import ExerciseDashboard from "./ExerciseDashboard";
import LoadingAnimation from "./LoadingAnimation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { 
  initPoseDetector, 
  detectPose, 
  drawPose,
} from "@/services/poseDetectionService";

// Extend the Window interface to include __userSets
declare global {
  interface Window {
    __userSets?: Record<ExerciseType, number>;
  }
}
import {
  ExerciseState,
  ExerciseType,
  EXERCISES,
  initExerciseState,
  processExerciseState,
  RepState
} from "@/services/exerciseService";
import { Dumbbell, Camera, FileVideo, AlertTriangle, Play, Pause, RefreshCw, CameraOff } from "lucide-react";

const FitnessTracker = ({ className }) => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null); // Ref for the video element
  const animationRef = useRef(null);
  const countdownAudioRef = useRef(null); // Ref for the countdown audio
  
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false); // <-- Add camera state, default off
  const [pose, setPose] = useState(null);
  const [currentExercise, setCurrentExercise] = useState(ExerciseType.NONE);
  const [exerciseState, setExerciseState] = useState(initExerciseState(ExerciseType.NONE));
  const [inputMode, setInputMode] = useState('webcam');
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [videoError, setVideoError] = useState(null);
  const [showExerciseDemo, setShowExerciseDemo] = useState(false);
  const [exerciseStates, setExerciseStates] = useState({
    [ExerciseType.NONE]: initExerciseState(ExerciseType.NONE),
    [ExerciseType.SQUAT]: initExerciseState(ExerciseType.SQUAT),
    [ExerciseType.BICEP_CURL]: initExerciseState(ExerciseType.BICEP_CURL),
    [ExerciseType.PUSH_UP]: initExerciseState(ExerciseType.PUSH_UP),
    [ExerciseType.PULL_UP]: initExerciseState(ExerciseType.PULL_UP),
  });
  const [userSets, setUserSets] = useState({
    [ExerciseType.NONE]: 0,
    [ExerciseType.SQUAT]: EXERCISES[ExerciseType.SQUAT].sets,
    [ExerciseType.BICEP_CURL]: EXERCISES[ExerciseType.BICEP_CURL].sets,
    [ExerciseType.PUSH_UP]: EXERCISES[ExerciseType.PUSH_UP].sets,
    [ExerciseType.PULL_UP]: EXERCISES[ExerciseType.PULL_UP].sets,
  });
  const [userRestTimes, setUserRestTimes] = useState({
    [ExerciseType.NONE]: 0,
    [ExerciseType.SQUAT]: EXERCISES[ExerciseType.SQUAT].restBetweenSets,
    [ExerciseType.BICEP_CURL]: EXERCISES[ExerciseType.BICEP_CURL].restBetweenSets,
    [ExerciseType.PUSH_UP]: EXERCISES[ExerciseType.PUSH_UP].restBetweenSets,
    [ExerciseType.PULL_UP]: EXERCISES[ExerciseType.PULL_UP].restBetweenSets,
  });
  const [countdown, setCountdown] = useState(null); // For 3-2-1 countdown
  const [isFirstStart, setIsFirstStart] = useState(true); // Track if it's the first time starting

  const handleSetsChange = (type, sets) => {
    setUserSets(prev => ({ ...prev, [type]: sets }));
  };

  const handleRestTimeChange = (type, restTime) => {
    setUserRestTimes(prev => ({ ...prev, [type]: restTime }));
  };

  useEffect(() => {
    // Initialize countdown audio
    // Do not preload audio on mount to avoid autoplay restrictions; create it on user gesture
    countdownAudioRef.current = null;

    const loadModel = async () => {
      try {
        await initPoseDetector();
        setIsModelLoaded(true);
      } catch (error) {
        console.error("Error initializing pose detector:", error);
      }
    };

    loadModel();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Cleanup audio element
      if (countdownAudioRef.current) {
        countdownAudioRef.current.pause();
        countdownAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    window.__userSets = userSets;
  }, [userSets]);

  const processFrame = useCallback(async (sourceElement) => {
    if (!isModelLoaded) {
      console.log('[DEBUG] Model not loaded, skipping frame.');
      return;
    }
    if (!isTracking && !(inputMode === 'webcam' && isCameraOn)) {
      console.log('[DEBUG] Not tracking, skipping frame.');
      return;
    }
    try {
      let sourceWidth = 0;
      let sourceHeight = 0;
      if (sourceElement instanceof HTMLVideoElement) {
        sourceWidth = sourceElement.videoWidth;
        sourceHeight = sourceElement.videoHeight;
      } else if (sourceElement instanceof HTMLImageElement) {
        sourceWidth = sourceElement.naturalWidth;
        sourceHeight = sourceElement.naturalHeight;
      } else if (sourceElement instanceof HTMLCanvasElement || sourceElement instanceof ImageData) {
        sourceWidth = sourceElement.width;
        sourceHeight = sourceElement.height;
      }
      if (sourceWidth === 0 || sourceHeight === 0) {
        console.log('[DEBUG] Source dimensions are zero, skipping frame.');
        return;
      }
      const detectedPose = await detectPose(sourceElement);
      if (isTracking) {
        console.log('[DEBUG] Detected Pose:', detectedPose ? 'Pose found' : 'No pose detected');
      }
      setPose(detectedPose);
      if (canvasRef.current && detectedPose) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          if (canvasRef.current.width !== sourceWidth || canvasRef.current.height !== sourceHeight) {
            canvasRef.current.width = sourceWidth;
            canvasRef.current.height = sourceHeight;
          }
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          try {
            if (sourceElement instanceof ImageData) {
              ctx.putImageData(sourceElement, 0, 0);
            } else {
              ctx.drawImage(sourceElement, 0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          } catch (drawError) {
            console.error('[DEBUG] Error drawing source element to canvas:', drawError);
          }
          const primaryLandmarks = currentExercise !== ExerciseType.NONE ? EXERCISES[currentExercise].primaryLandmarks : undefined;
          drawPose(ctx, detectedPose, {
            isCorrectForm: exerciseState.formCorrect,
            primaryLandmarks: primaryLandmarks,
            formErrors: exerciseState.formIssues
          });
        }
      }
      if (isTracking && detectedPose && currentExercise !== ExerciseType.NONE) {
        // Pass user settings for sets and rest time
        const updatedState = processExerciseState(
          exerciseState,
          detectedPose,
          {
            sets: userSets[currentExercise],
            restBetweenSets: userRestTimes[currentExercise],
          }
        );
        if (JSON.stringify(updatedState) !== JSON.stringify(exerciseState)) {
          setExerciseState(updatedState);
          setExerciseStates(prev => ({ ...prev, [currentExercise]: updatedState }));
        }
      }
    } catch (error) {
      console.error('[DEBUG] Error processing frame:', error);
    }
  }, [
    isModelLoaded,
    isTracking,
    inputMode,
    isCameraOn,
    currentExercise,
    exerciseState,
    setExerciseState,
    setExerciseStates,
    userSets,
    userRestTimes
  ]);

  const processVideoFrame = useCallback(() => {
    if (!isModelLoaded || !isTracking || !videoRef.current || videoRef.current.paused || videoRef.current.ended) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    processFrame(videoRef.current);

    animationRef.current = requestAnimationFrame(processVideoFrame);
  }, [isModelLoaded, isTracking, processFrame]);

  const startVideoPlayback = useCallback(() => {
    if (!uploadedVideo || !videoRef.current) return;
    
    if (videoRef.current.src !== uploadedVideo.src) {
      videoRef.current.src = uploadedVideo.src;
    }
    
    setVideoError(null);
    
    const playVideo = () => {
      if (videoRef.current) {
        videoRef.current.play().then(() => {
          // Start processing frames ONLY after playback starts successfully
          if (!animationRef.current) {
             processVideoFrame(); 
          }
        }).catch(error => {
          console.error("Error playing video:", error);
          setVideoError("Failed to play video. Please try another file.");
          setIsTracking(false);
        });
      }
    };

    // Wait for the video to be ready to play
    if (videoRef.current.readyState >= videoRef.current.HAVE_FUTURE_DATA) {
      playVideo();
    } else {
      videoRef.current.oncanplaythrough = playVideo; // Use oncanplaythrough for better readiness
      videoRef.current.onerror = () => { // Add error handling for loading source
         console.error("Error loading video source.");
         setVideoError("Error loading video source. Please check the file.");
         setIsTracking(false);
      };
    }
  }, [uploadedVideo, processVideoFrame]); // Removed isTracking dependency, handled separately

  const pauseVideoPlayback = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  useEffect(() => {
    if (inputMode === 'video' && uploadedVideo) {
      if (isTracking) {
        startVideoPlayback();
      } else {
        pauseVideoPlayback();
      }
    }
    return () => {
      pauseVideoPlayback();
    };
  }, [isTracking, uploadedVideo, inputMode, startVideoPlayback]);

  const handleVideoLoad = (video) => {
    setUploadedVideo(video);
    setVideoError(null);
    setIsTracking(false);
    setExerciseState(initExerciseState(currentExercise));
    setExerciseStates(prev => ({ ...prev, [currentExercise]: initExerciseState(currentExercise) }));
    setPose(null);
    if(canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    // Debug log for video load
    console.log('[DEBUG] Video loaded:', video.src, 'ReadyState:', video.readyState);
    // Remove automatic playback on load. Playback will be initiated by handleToggleTracking after countdown.
    video.currentTime = 0;
    setIsFirstStart(true); // Reset for the next start click after video load
  };

  const handleExerciseSelect = (type) => {
    setCurrentExercise(type);
    setExerciseState(initExerciseState(type));
    setShowExerciseDemo(true);
    // toast.info(`Selected exercise: ${EXERCISES[type].name}`); // Remove or comment out this line
  };

  const resetVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (isTracking) {
        videoRef.current.play();
      }
    }
  };

  const handleToggleTracking = () => {
    if (!isTracking) {
      if (isFirstStart) {
        setIsFirstStart(false);
        let count = 3;
        setCountdown(count);
        
        // Play the countdown sound only once at the beginning of the countdown
        if (!countdownAudioRef.current) {
          countdownAudioRef.current = new Audio('/videoplayback.m4a');
        }
        countdownAudioRef.current.currentTime = 0;
        countdownAudioRef.current.play().catch(error => console.error("Error playing countdown sound:", error));

        const countdownInterval = setInterval(() => {
          count -= 1;
          setCountdown(count);
          // No need to play sound here anymore if it's a full "3-2-1" audio
          if (count === 0) {
            clearInterval(countdownInterval);
            setCountdown(null);
            if (inputMode === 'video' && uploadedVideo) {
              startVideoPlayback(); // Start playback after countdown finishes
            }
            setIsTracking(true);
          }
        }, 1000);
      } else { // Not the first start, no countdown
        // For video mode, playback is only started after the countdown.
        // If not the first start, we just toggle tracking state.
        setIsTracking(true);
      }
    } else {
      if (inputMode === 'video') {
        pauseVideoPlayback();
      }
      setIsTracking(false);
    }
  };

  // <-- Add function to toggle camera -->
  const handleToggleCamera = () => {
    setIsCameraOn(!isCameraOn);
    // If turning camera off, also stop tracking
    if (isCameraOn && isTracking) {
      setIsTracking(false);
    }
  };

  const getFormStatus = () => {
    if (currentExercise === ExerciseType.NONE) return null;
    
    if (exerciseState.repState === RepState.RESTING) {
      return (
        <div className="mt-2 p-2 bg-blue-100 text-blue-800 rounded-md text-sm">
          Resting between sets...
        </div>
      );
    }
    
    if (exerciseState.repState === RepState.INCORRECT_FORM) {
      return (
        <div className="mt-2 p-2 bg-red-100 text-red-800 rounded-md text-sm flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span>Incorrect form detected. Fix to continue counting.</span>
        </div>
      );
    }
    
    if (exerciseState.formCorrect) {
      return (
        <div className="mt-2 p-2 bg-green-100 text-green-800 rounded-md text-sm">
          Good form! Keep it up.
        </div>
      );
    }
    
    return null;
  };

  useEffect(() => {
    if (currentExercise !== ExerciseType.NONE) {
      setExerciseStates(prev => ({
        ...prev,
        [currentExercise]: exerciseState
      }));
    }
  }, [exerciseState, currentExercise]);

  return (
    <div className={cn("grid gap-6 px-2 sm:px-4", className)}>
      <ExerciseDemoModal
        exerciseType={currentExercise}
        open={showExerciseDemo}
        onClose={() => setShowExerciseDemo(false)}
      />
      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="flex-1 min-w-0">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
              <CardTitle className="flex items-center text-lg sm:text-xl">
                {inputMode === 'webcam' ? (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Pose Detection
                  </>
                ) : (
                  <>
                    <FileVideo className="w-5 h-5 mr-2" />
                    Video Analysis
                  </>
                )}
              </CardTitle>
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v === 'webcam' ? 'webcam' : 'video')} className="w-full sm:w-auto mt-2 sm:mt-0">
                <TabsList>
                  <TabsTrigger value="webcam" className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    <span className="hidden sm:inline">Webcam</span>
                  </TabsTrigger>
                  <TabsTrigger value="video" className="flex items-center gap-2">
                    <FileVideo className="w-4 h-4" />
                    <span className="hidden sm:inline">Video</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {inputMode === 'webcam' ? (
                // <-- Conditionally render WebcamView -->
                isCameraOn ? (
                  <WebcamView
                    className="w-full h-auto overflow-hidden rounded-md"
                    width={640}
                    height={480}
                    onFrame={processFrame}
                    drawCanvas={true}
                    canvasRef={canvasRef}
                  />
                ) : (
                  // <-- Placeholder when camera is off -->
                  <div className="w-full aspect-video bg-muted rounded-md flex flex-col items-center justify-center text-muted-foreground">
                    <CameraOff className="w-16 h-16 mb-4" />
                    <p>Camera is off</p>
                  </div>
                )
              ) : (
                uploadedVideo ? (
                  <div className="relative w-full aspect-video">
                    {/* Video element - always visible */}
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    
                    {/* Canvas overlay - always rendered on top */}
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-muted rounded-md flex flex-col items-center justify-center text-muted-foreground">
                    <FileVideo className="w-16 h-16 mb-4" />
                    <p>No video selected</p>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const video = document.createElement('video');
                          video.src = URL.createObjectURL(file);
                          handleVideoLoad(video);
                        }
                      }}
                      id="video-upload"
                    />
                    <label htmlFor="video-upload">
                      <Button variant="outline" size="sm" className="mt-4" asChild>
                        <span>
                          <FileVideo className="w-4 h-4 mr-2" />
                          Upload Video
                        </span>
                      </Button>
                    </label>
                  </div>
                )
              )}
              
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md z-10">
                  <p className="text-6xl font-bold text-primary">{countdown > 0 ? countdown : 'Go!'}</p>
                </div>
              )}
              
              {!isModelLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                  <LoadingAnimation message="Loading AI Model..." />
                </div>
              )}
              
              <div className="absolute bottom-4 right-4">
                <Button
                  onClick={handleToggleTracking}
                  variant={isTracking ? "destructive" : "default"}
                  size="sm"
                  // <-- Disable if model not loaded OR (webcam mode AND camera is off) OR (video mode AND no video) -->
                  disabled={!isModelLoaded || (inputMode === 'webcam' && !isCameraOn) || (inputMode === 'video' && !uploadedVideo) || countdown !== null}
                >
                  {isTracking ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause Tracking
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Tracking
                    </>
                  )}
                </Button>
              </div>

              <div className="absolute bottom-4 left-4">
                <Button
                  onClick={handleToggleCamera}
                  variant="outline"
                  size="sm"
                  disabled={!isCameraOn && inputMode !== 'webcam'}
                >
                  {isCameraOn ? (
                    <>
                      <CameraOff className="w-4 h-4 mr-2" />
                      Turn Camera Off
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Turn Camera On
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {!isTracking && isModelLoaded && (
              <div className="mt-4 p-3 bg-muted rounded-md text-sm flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-warning" />
                Tracking is paused. Click Start Tracking to begin exercise detection.
              </div>
            )}
            
            {isTracking && getFormStatus()}
          </CardContent>
        </Card>

        <div className="w-full lg:w-80">
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Dumbbell className="w-5 h-5 mr-2" />
                Select Exercise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                {Object.values(ExerciseType)
                  .filter(type => type !== ExerciseType.NONE)
                  .map((type) => (
                    <Button
                      key={type}
                      variant={currentExercise === type ? "default" : "outline"}
                      className={cn(
                        "h-auto py-4 flex flex-col items-center justify-center",
                        currentExercise === type && "border-primary"
                      )}
                      onClick={() => handleExerciseSelect(type)}
                    >
                      <Dumbbell className="h-5 w-5 mb-1" />
                      <span className="text-sm">{EXERCISES[type].name}</span>
                    </Button>
                  ))}
              </div>
              
              {currentExercise !== ExerciseType.NONE && (
                <ExerciseStats 
                  className=""
                  exerciseState={exerciseState} 
                  sets={userSets[currentExercise]}
                  onSetsChange={sets => handleSetsChange(currentExercise, sets)}
                  restTime={userRestTimes[currentExercise]}
                  onRestTimeChange={restTime => handleRestTimeChange(currentExercise, restTime)}
                />
              )}
              
              {currentExercise === ExerciseType.NONE && (
                <div className="p-4 text-sm text-center text-muted-foreground">
                  <p>Select an exercise to begin tracking your workout.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {currentExercise !== ExerciseType.NONE && (
        <FormGuide exerciseType={currentExercise} />
      )}
      
      <ExerciseDashboard exerciseStates={exerciseStates} />
    </div>
  );
};

export default FitnessTracker;
