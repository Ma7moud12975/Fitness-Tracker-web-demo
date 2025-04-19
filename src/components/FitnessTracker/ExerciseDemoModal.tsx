
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
  const exerciseImages = {
    [ExerciseType.SQUAT]: "https://i.pinimg.com/originals/42/52/27/425227c898782116a5955666be277885.gif",
    [ExerciseType.BICEP_CURL]: "https://hips.hearstapps.com/hmg-prod/images/workouts/2016/03/dumbbellcurl-1457043876.gif",
    [ExerciseType.SHOULDER_PRESS]: "https://media1.tenor.com/m/4jVNicvGHN8AAAAC/shoulder-press-the-rock.gif"
  };
  
  // Static image fallbacks as final resort
  const staticFallbacks = {
    [ExerciseType.SQUAT]: "https://www.inspireusafoundation.org/wp-content/uploads/2022/02/barbell-full-squat-movement.jpg",
    [ExerciseType.BICEP_CURL]: "https://cdn.shopify.com/s/files/1/1876/4703/files/shutterstock_419477203_1024x1024.jpg",
    [ExerciseType.SHOULDER_PRESS]: "https://www.inspireusafoundation.org/wp-content/uploads/2022/03/dumbbell-overhead-press.jpg"
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
