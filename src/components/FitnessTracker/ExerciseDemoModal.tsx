import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ExerciseType, EXERCISES } from "@/services/exerciseService";
import { Card } from "@/components/ui/card";
import { AlertCircle, Info } from "lucide-react";

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
  
  // Exercise GIF sources provided by the user
  const exerciseImages: Record<ExerciseType, string> = {
    [ExerciseType.SQUAT]: "https://i.pinimg.com/originals/42/52/27/425227c898782116a5955666be277885.gif",
    [ExerciseType.BICEP_CURL]: "https://i.pinimg.com/originals/68/4d/50/684d50925eabbdf60f66d4bf7013c9ef.gif",
    // [ExerciseType.SHOULDER_PRESS]: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExa2RtcjdoNGxzaGE2dHJwM3hxaHplMnhwcGNjc2VoNHF0Z2VuZ25wNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/7lugb7ObGYiXe/giphy.gif", // Removed
    [ExerciseType.PUSH_UP]: "https://i.pinimg.com/originals/fd/bb/09/fdbb092b58863e5c86fdb8bb1411fcea.gif",
    [ExerciseType.PULL_UP]: "https://tunturi.org/Blogs/2022/09-pull-up.gif",
    [ExerciseType.NONE]: "", // Keep NONE or handle appropriately
  };
  
  // Static image fallbacks as final resort
  const staticFallbacks: Record<ExerciseType, string> = {
    [ExerciseType.SQUAT]: "https://www.inspireusafoundation.org/wp-content/uploads/2022/02/barbell-full-squat-movement.jpg",
    [ExerciseType.BICEP_CURL]: "https://cdn.shopify.com/s/files/1/1876/4703/files/shutterstock_419477203_1024x1024.jpg",
    // [ExerciseType.SHOULDER_PRESS]: "https://www.inspireusafoundation.org/wp-content/uploads/2022/03/dumbbell-overhead-press.jpg", // Removed
    [ExerciseType.PUSH_UP]: "https://www.inspireusafoundation.org/wp-content/uploads/2022/02/push-up-movement.jpg",
    [ExerciseType.PULL_UP]: "https://www.inspireusafoundation.org/wp-content/uploads/2022/02/pull-up-movement.jpg",
    [ExerciseType.NONE]: "", // Keep NONE or handle appropriately
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
