
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
  
  // Map exercise types to appropriate image paths
  const exerciseImages = {
    [ExerciseType.SQUAT]: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXp3czk4dWYzcDIzamVsMjRldWpxZzRjZmNkdW0xazd5NDRvc2wzYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2AbylVLJSvZiXzXakg/giphy.gif",
    [ExerciseType.BICEP_CURL]: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnRteWNxb25rb3Nod2N4YzVmM2RmZ3V3cnBzdjZ5dmxyamE3MG9jNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26BGD4XaoPO3MLIMM/giphy.gif",
    [ExerciseType.SHOULDER_PRESS]: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3lncHNoZ3M1ZDZsMjZpNm0waTM3cTJxaW1tZnAwZ2MzMHB3dHRqbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3ohs7YlhA8hn9oWrMQ/giphy.gif"
  };
  
  // Fallback to local path if external images don't work
  const imgSrc = imgError 
    ? `/exercises/${exerciseType.toLowerCase()}.gif` 
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
              <div className="flex flex-col items-center justify-center p-8 bg-muted">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-center">
                  Exercise demonstration image could not be loaded.
                </p>
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
