
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExerciseType, EXERCISES } from "@/services/exerciseService";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

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
  
  if (exerciseType === ExerciseType.NONE) return null;

  const exercise = EXERCISES[exerciseType];
  
  // More reliable GIF sources - using direct links instead of Giphy embeds
  const exerciseImages = {
    [ExerciseType.SQUAT]: "https://i.imgur.com/RM6PGn3.gif",
    [ExerciseType.BICEP_CURL]: "https://i.imgur.com/0NbE7FW.gif",
    [ExerciseType.SHOULDER_PRESS]: "https://i.imgur.com/lHh3wXA.gif"
  };
  
  // Static image fallbacks if GIFs don't load
  const staticFallbacks = {
    [ExerciseType.SQUAT]: "https://www.inspireusafoundation.org/wp-content/uploads/2022/02/barbell-full-squat-movement.jpg",
    [ExerciseType.BICEP_CURL]: "https://cdn.shopify.com/s/files/1/1876/4703/files/shutterstock_419477203_1024x1024.jpg",
    [ExerciseType.SHOULDER_PRESS]: "https://www.inspireusafoundation.org/wp-content/uploads/2022/03/dumbbell-overhead-press.jpg"
  };
  
  // First try the GIF, then local path, then static fallback
  const imgSrc = imgError 
    ? staticFallbacks[exerciseType] 
    : exerciseImages[exerciseType];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{exercise.name} - Demonstration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card className="overflow-hidden">
            {imgError ? (
              <div className="relative">
                <img
                  src={staticFallbacks[exerciseType]}
                  alt={`${exercise.name} static demonstration`}
                  className="w-full h-auto"
                  onError={() => {
                    console.error(`Failed to load static fallback for ${exerciseType}`);
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-white text-xs text-center">
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
