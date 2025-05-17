
import React, { useState, useEffect, useRef } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ExerciseType, EXERCISES } from "@/services/exerciseService";
import { Card } from "@/components/ui/card";
import { AlertCircle, Info } from "lucide-react";
import Player from "lottie-react";
import { useIsMobile } from "@/hooks/use-mobile";

// Modern device recommendation banner (outside modal, on app entry)
export function DeviceBanner() {
  const isMobile = useIsMobile();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!isMobile) return; // Only show on mobile
    const timer = setTimeout(() => setShow(true), 2200); // Show after 2.2s
    return () => clearTimeout(timer);
  }, [isMobile]);
  if (!show || !isMobile) return null;
  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-7 py-4 rounded-2xl shadow-2xl bg-card border border-border animate-fade-in backdrop-blur-md transition-all duration-700 dark:bg-card/80 dark:border-border/60">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-primary">
        <rect x="3" y="5" width="18" height="14" rx="2" fill="currentColor"/>
        <rect x="7" y="17" width="10" height="2" rx="1" fill="#818cf8"/>
        <rect x="9" y="7" width="6" height="6" rx="1" fill="#f472b6"/>
      </svg>
      <div className="flex flex-col text-center">
        <span className="font-bold text-primary text-base">Best Experience on PC</span>
        <span className="text-xs text-muted-foreground">For the smoothest tracking, full features, and best visuals, we recommend using this app on a desktop or laptop computer.<br/>Mobile is supported, but some features may be limited.</span>
      </div>
      <button
        className="ml-4 text-primary hover:text-pink-500 transition-colors text-xl font-bold focus:outline-none"
        aria-label="Close banner"
        onClick={() => setShow(false)}
      >
        ×
      </button>
    </div>
  );
}

interface ExerciseDemoModalProps {
  exerciseType: ExerciseType;
  open: boolean;
  onClose: () => void;
}

const ExerciseDemoModal: React.FC<ExerciseDemoModalProps> = ({
  exerciseType,
  open,
  onClose,
}) => {
  const [imgError, setImgError] = useState(false);
  
  const voiceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Voice assistant: speak when modal opens
  useEffect(() => {
    if (open && exerciseType !== ExerciseType.NONE) {
      const exercise = EXERCISES[exerciseType];
      const instructions = [
        `${exercise.name} demonstration.`,
        ...exercise.formInstructions
      ].join(' ');
      if ('speechSynthesis' in window) {
        if (voiceRef.current) {
          window.speechSynthesis.cancel();
        }
        const utter = new window.SpeechSynthesisUtterance(instructions);
        utter.rate = 1.05;
        utter.pitch = 1.1;
        utter.lang = 'en-US';
        window.speechSynthesis.speak(utter);
        voiceRef.current = utter;
      }
    }
    // Stop voice on close
    return () => {
      if (voiceRef.current) {
        window.speechSynthesis.cancel();
        voiceRef.current = null;
      }
    };
  }, [open, exerciseType]);
  
  if (exerciseType === ExerciseType.NONE) return null;

  const exercise = EXERCISES[exerciseType];
  
  // Exercise GIF sources provided by the user
  const exerciseImages: Record<ExerciseType, string> = {
    [ExerciseType.SQUAT]: "https://i.pinimg.com/originals/f9/db/a3/f9dba36451cab8b0b5be6d5ec9fd438a.gif",
    [ExerciseType.BICEP_CURL]: "https://i.pinimg.com/originals/68/4d/50/684d50925eabbdf60f66d4bf7013c9ef.gif",
    [ExerciseType.PUSH_UP]: "https://i.pinimg.com/originals/fd/bb/09/fdbb092b58863e5c86fdb8bb1411fcea.gif",
    [ExerciseType.PULL_UP]: "https://tunturi.org/Blogs/2022/09-pull-up.gif",
    [ExerciseType.NONE]: "", // Keep NONE or handle appropriately
  };
  
  // Static image fallbacks as final resort
  const staticFallbacks: Record<ExerciseType, string> = {
    [ExerciseType.SQUAT]: "https://www.inspireusafoundation.org/wp-content/uploads/2022/02/barbell-full-squat-movement.jpg",
    [ExerciseType.BICEP_CURL]: "https://cdn.shopify.com/s/files/1/1876/4703/files/shutterstock_419477203_1024x1024.jpg",
    [ExerciseType.PUSH_UP]: "https://www.inspireusafoundation.org/wp-content/uploads/2022/02/push-up-movement.jpg",
    [ExerciseType.PULL_UP]: "https://www.inspireusafoundation.org/wp-content/uploads/2022/02/pull-up-movement.jpg",
    [ExerciseType.NONE]: "", // Keep NONE or handle appropriately
  };

  // Lottie animation sources for each exercise (replace with your own Lottie JSON imports or URLs)
  // Example: import squatLottie from "../../../public/lottie/squat.json";
  const lottieAnimations: Record<ExerciseType, string | null> = {
    [ExerciseType.SQUAT]: null, // e.g. squatLottie
    [ExerciseType.BICEP_CURL]: null, // e.g. bicepCurlLottie
    [ExerciseType.PUSH_UP]: null, // e.g. pushUpLottie
    [ExerciseType.PULL_UP]: null, // e.g. pullUpLottie
    [ExerciseType.NONE]: null,
  };
  
  // First try the GIF, then fallback to static image
  const imgSrc = imgError 
    ? staticFallbacks[exerciseType] 
    : exerciseImages[exerciseType];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{exercise.name} - Demonstration</DialogTitle>
          <DialogDescription>
            Watch the demonstration and follow the key form points below
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Card className="overflow-hidden">
            {/* Try Lottie animation first, then GIF, then static image */}
            {lottieAnimations[exerciseType] ? (
              <Player
                animationData={lottieAnimations[exerciseType]!}
                autoplay
                loop
                style={{ width: "100%", height: 320, background: "#18181b" }}
              />
            ) : imgError ? (
              <div className="relative">
                <img
                  src={staticFallbacks[exerciseType]}
                  alt={`${exercise.name} static demonstration`}
                  className="w-full h-auto"
                  onError={() => {
                    console.error(`Failed to load static fallback for ${exerciseType}`);
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-white text-xs flex items-center justify-center">
                  <Info className="w-3 h-3 mr-1" />
                  Static image shown - GIF could not be loaded
                </div>
              </div>
            ) : (
              <img
                src={imgSrc}
                alt={`${exercise.name} demonstration`}
                className="w-full h-auto"
                onError={() => setImgError(true)}
              />
            )}
          </Card>
          <div className="space-y-2">
            <h4 className="font-medium">Key Points:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {exercise.formInstructions.map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseDemoModal;
