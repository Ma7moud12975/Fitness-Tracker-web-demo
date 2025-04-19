
import React, { useEffect, useRef, useState } from "react";
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
import { Dumbbell, Camera, FileVideo, AlertTriangle, Play, Pause, RefreshCw } from "lucide-react";

interface FitnessTrackerProps {
  className?: string;
}

const FitnessTracker: React.FC<FitnessTrackerProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
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
    [ExerciseType.SHOULDER_PRESS]: initExerciseState(ExerciseType.SHOULDER_PRESS),
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

  useEffect(() => {
    if (isTracking && uploadedVideo && inputMode === 'video') {
      startVideoPlayback();
    } else if (!isTracking && uploadedVideo && inputMode === 'video') {
      pauseVideoPlayback();
    }
  }, [isTracking, uploadedVideo, inputMode]);

  const startVideoPlayback = () => {
    if (!uploadedVideo || !videoRef.current) return;
    
    if (videoRef.current.src !== uploadedVideo.src) {
      videoRef.current.src = uploadedVideo.src;
    }
    
    setVideoError(null);
    
    const startPlayback = () => {
      if (videoRef.current) {
        videoRef.current.play().catch(error => {
          console.error("Error playing video:", error);
          setVideoError("Failed to play video. Please try another file.");
          setIsTracking(false);
        });
      }
    };
    
    if (videoRef.current.readyState >= 2) {
      startPlayback();
    } else {
      videoRef.current.oncanplay = startPlayback;
    }
    
    if (!animationRef.current && videoRef.current) {
      processVideoFrame();
    }
  };
  
  const pauseVideoPlayback = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  const processVideoFrame = () => {
    if (!isModelLoaded || !isTracking || !videoRef.current) return;
    
    // Check if video is still playing
    if (videoRef.current.paused || videoRef.current.ended) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    // Process the current video frame
    processFrame(videoRef.current);
    
    // Request next frame
    animationRef.current = requestAnimationFrame(processVideoFrame);
  };

  const processFrame = async (imageData: ImageData | HTMLVideoElement) => {
    if (!isModelLoaded || !isTracking) return;

    try {
      if (imageData instanceof HTMLVideoElement) {
        if (imageData.videoWidth === 0 || imageData.videoHeight === 0 || 
            imageData.paused || imageData.ended) {
          return;
        }
      }

      const detectedPose = await detectPose(imageData);
      setPose(detectedPose);

      if (canvasRef.current && detectedPose) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          // Clear the canvas before drawing
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          if (imageData instanceof ImageData) {
            ctx.putImageData(imageData, 0, 0);
          } else {
            ctx.drawImage(
              imageData, 
              0, 0, 
              canvasRef.current.width, 
              canvasRef.current.height
            );
          }

          if (currentExercise !== ExerciseType.NONE) {
            // Get primary landmarks and form issues from exercise state
            const primaryLandmarks = EXERCISES[currentExercise].primaryLandmarks;
            
            // Draw the pose with color feedback and highlighted primary landmarks
            drawPose(ctx, detectedPose, { 
              isCorrectForm: exerciseState.formCorrect,
              primaryLandmarks: primaryLandmarks,
              formErrors: exerciseState.formIssues
            });
          } else {
            // Just draw the pose with neutral colors if no exercise is selected
            drawPose(ctx, detectedPose);
          }
        }
      }

      if (detectedPose && currentExercise !== ExerciseType.NONE) {
        const prevFormCorrect = exerciseState.formCorrect;
        const updatedState = processExerciseState(exerciseState, detectedPose);
        
        // If form changed from incorrect to correct, show a success toast
        if (!prevFormCorrect && updatedState.formCorrect) {
          toast.success("Form corrected! Continue exercising");
        } 
        // If form changed from correct to incorrect, show a warning toast
        else if (prevFormCorrect && !updatedState.formCorrect) {
          toast.warning("Incorrect form detected. Pausing count.");
        }
        
        setExerciseState(updatedState);
      }
    } catch (error) {
      console.error("Error processing frame:", error);
    }
  };

  const handleVideoLoad = (video: HTMLVideoElement) => {
    setUploadedVideo(video);
    setInputMode('video');
    setIsTracking(false);
    setPose(null);
    setVideoError(null);
    
    if (canvasRef.current) {
      // Set canvas dimensions to match the video
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;
    }
    
    toast.info("Video loaded! Press 'Start Tracking' to begin analysis");
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
  }, [exerciseState.totalReps, currentExercise]);

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
                <WebcamView
                  className="w-full h-auto overflow-hidden rounded-md"
                  width={640}
                  height={480}
                  onFrame={processFrame}
                  drawCanvas={true}
                  canvasRef={canvasRef}
                />
              ) : (
                uploadedVideo ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      className={cn(
                        "w-full h-auto rounded-md",
                        isTracking ? "hidden" : "block"
                      )}
                      width={640}
                      height={480}
                      controls
                    />
                    <canvas
                      ref={canvasRef}
                      className={cn(
                        "w-full h-auto rounded-md", 
                        isTracking ? "block" : "hidden"
                      )} 
                      width={640} 
                      height={480}
                    />
                    
                    {videoError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 text-destructive rounded-md">
                        <div className="bg-card p-4 rounded-md shadow-lg max-w-xs text-center">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                          <p className="font-medium">{videoError}</p>
                          <Button 
                            variant="outline" 
                            className="mt-3"
                            onClick={() => setVideoError(null)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {isTracking && (
                      <div className="absolute bottom-16 right-4">
                        <Button
                          onClick={resetVideo}
                          variant="outline"
                          size="sm"
                          className="bg-background/80"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Restart Video
                        </Button>
                      </div>
                    )}
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
                  disabled={!isModelLoaded || (inputMode === 'video' && !uploadedVideo)}
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
