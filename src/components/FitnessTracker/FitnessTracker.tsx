import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import WebcamView from "./WebcamView";
import ExerciseStats from "./ExerciseStats";
import FormGuide from "./FormGuide";
import WelcomeModal from "./WelcomeModal";
import ExerciseDemoModal from "./ExerciseDemoModal";
import ExerciseDashboard from "./ExerciseDashboard";
import VideoUpload from "./VideoUpload";
import LoadingAnimation from "./LoadingAnimation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { 
  initPoseDetector, 
  detectPose, 
  drawPose,
  Pose
} from "@/services/poseDetectionService";
import {
  ExerciseState,
  ExerciseType,
  EXERCISES,
  initExerciseState,
  processExerciseState,
  RepState
} from "@/services/exerciseService";
import { Dumbbell, Camera, FileVideo, AlertTriangle, Play, Pause, RefreshCw, CameraOff } from "lucide-react";

interface FitnessTrackerProps {
  className?: string;
}

const FitnessTracker: React.FC<FitnessTrackerProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null); // Ref for the video element
  const animationRef = useRef<number | null>(null);
  
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false); // <-- Add camera state, default off
  const [pose, setPose] = useState<Pose | null>(null);
  const [currentExercise, setCurrentExercise] = useState<ExerciseType>(ExerciseType.NONE);
  const [exerciseState, setExerciseState] = useState<ExerciseState>(initExerciseState(ExerciseType.NONE));
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(true);
  const [inputMode, setInputMode] = useState<'webcam' | 'video'>('webcam');
  const [uploadedVideo, setUploadedVideo] = useState<HTMLVideoElement | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [showExerciseDemo, setShowExerciseDemo] = useState(false);
  const [exerciseStates, setExerciseStates] = useState<Record<ExerciseType, ExerciseState>>({
    [ExerciseType.NONE]: initExerciseState(ExerciseType.NONE),
    [ExerciseType.SQUAT]: initExerciseState(ExerciseType.SQUAT),
    [ExerciseType.BICEP_CURL]: initExerciseState(ExerciseType.BICEP_CURL),
    // [ExerciseType.SHOULDER_PRESS]: initExerciseState(ExerciseType.SHOULDER_PRESS), // Removed
    [ExerciseType.PUSH_UP]: initExerciseState(ExerciseType.PUSH_UP),
    [ExerciseType.PULL_UP]: initExerciseState(ExerciseType.PULL_UP),
  });

  useEffect(() => {
    const loadModel = async () => {
      try {
        await initPoseDetector();
        setIsModelLoaded(true);
        toast.success("AI model loaded successfully");
      } catch (error) {
        console.error("Error initializing pose detector:", error);
        toast.error("Failed to load AI model");
        // Add retry logic here if needed
      }
    };

    loadModel();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  const startVideoPlayback = useCallback(() => {
    if (!uploadedVideo || !videoRef.current) return;
    
    // Ensure the video source is set
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
  }, [uploadedVideo]); // Removed isTracking dependency, handled separately

  const pauseVideoPlayback = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  // Effect to control video playback based on tracking state
  useEffect(() => {
    if (inputMode === 'video' && uploadedVideo) {
      if (isTracking) {
        startVideoPlayback();
      } else {
        pauseVideoPlayback();
      }
    }
    // Cleanup function to pause video and cancel animation frame when component unmounts or mode changes
    return () => {
      pauseVideoPlayback();
    };
  }, [isTracking, uploadedVideo, inputMode, startVideoPlayback]);

  // The main loop for processing video frames
  const processVideoFrame = () => {
    if (!isModelLoaded || !isTracking || !videoRef.current || videoRef.current.paused || videoRef.current.ended) {
      // Stop the loop if tracking stops, video pauses/ends, or model isn't ready
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    // Process the current video frame
    processFrame(videoRef.current); // Pass the video element directly
    
    // Request the next frame
    animationRef.current = requestAnimationFrame(processVideoFrame);
  };

  // Unified frame processing for both webcam and video
  const processFrame = async (sourceElement: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageData) => {
    if (!isModelLoaded) return; // Don't process if model isn't loaded
    // Only process if tracking OR if it's the webcam and camera is on (for initial view without tracking)
    if (!isTracking && !(inputMode === 'webcam' && isCameraOn)) return; 

    try {
      // Ensure source has dimensions
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
        // console.log("Source dimensions are zero, skipping frame.");
        return; // Skip if source isn't ready
      }

      const detectedPose = await detectPose(sourceElement);
      if (isTracking) {
        console.log('Detected Pose:', detectedPose ? 'Pose found' : 'No pose detected');
      }
      setPose(detectedPose);

      // --- Drawing Logic --- 
      if (canvasRef.current && detectedPose) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          // Ensure canvas matches source dimensions
          if (canvasRef.current.width !== sourceWidth || canvasRef.current.height !== sourceHeight) {
            canvasRef.current.width = sourceWidth;
            canvasRef.current.height = sourceHeight;
          }
          
          // Clear canvas
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Draw video frame to canvas (enabled by default)
          try {
            if (sourceElement instanceof ImageData) {
              ctx.putImageData(sourceElement, 0, 0);
            } else {
              ctx.drawImage(sourceElement as CanvasImageSource, 0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          } catch (drawError) {
            console.error("Error drawing source element to canvas:", drawError);
          }
          // Draw pose overlay as before
          const primaryLandmarks = currentExercise !== ExerciseType.NONE ? EXERCISES[currentExercise].primaryLandmarks : undefined;
          drawPose(ctx, detectedPose, {
            isCorrectForm: exerciseState.formCorrect,
            primaryLandmarks: primaryLandmarks,
            formErrors: exerciseState.formIssues
          });
        }
      }

      // --- Exercise State Logic (Only if tracking) ---
      if (isTracking && detectedPose && currentExercise !== ExerciseType.NONE) {
        const updatedState = processExerciseState(exerciseState, detectedPose);
        
        // Only update state if it has actually changed to prevent unnecessary re-renders
        if (JSON.stringify(updatedState) !== JSON.stringify(exerciseState)) {
           setExerciseState(updatedState);
           // Update the specific exercise state in the dashboard record
           setExerciseStates(prev => ({ ...prev, [currentExercise]: updatedState }));
        }
      }

    } catch (error) {
      console.error("Error processing frame:", error);
      // Optionally add a toast notification for processing errors
      // toast.error("Error processing frame");
    }
  };

  const handleVideoLoad = (video: HTMLVideoElement) => {
    setUploadedVideo(video);
    setVideoError(null);
    // Reset tracking state when a new video is loaded
    if (isTracking) {
      setIsTracking(false);
    }
    // Reset exercise state for the new video
    setExerciseState(initExerciseState(currentExercise));
    setExerciseStates(prev => ({ ...prev, [currentExercise]: initExerciseState(currentExercise) }));
    setPose(null); // Clear previous pose
    // Clear canvas
    if(canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleExerciseSelect = (type: ExerciseType) => {
    setCurrentExercise(type);
    setExerciseState(initExerciseState(type));
    setShowExerciseDemo(true);
    toast.info(`Selected exercise: ${EXERCISES[type].name}`);
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
    if (!isTracking && inputMode === 'video' && uploadedVideo) {
      startVideoPlayback();
    } else if (isTracking && inputMode === 'video') {
      pauseVideoPlayback();
    }
    
    setIsTracking(!isTracking);
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
    <div className={cn("grid gap-6", className)}>
      <WelcomeModal open={showWelcomeModal} onClose={() => setShowWelcomeModal(false)} />
      <ExerciseDemoModal
        exerciseType={currentExercise}
        open={showExerciseDemo}
        onClose={() => setShowExerciseDemo(false)}
      />
      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
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
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'webcam' | 'video')} className="w-auto">
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
                    <Button variant="outline" size="sm" onClick={handleToggleCamera} className="mt-4">
                      <Camera className="w-4 h-4 mr-2" /> Turn Camera On
                    </Button>
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
                  <VideoUpload onVideoLoad={handleVideoLoad} />
                )
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
                  disabled={!isModelLoaded || (inputMode === 'webcam' && !isCameraOn) || (inputMode === 'video' && !uploadedVideo)}
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
                <ExerciseStats exerciseState={exerciseState} />
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
