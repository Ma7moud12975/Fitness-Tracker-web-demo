import React from 'react';
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ExerciseState, ExerciseType, EXERCISES, RepState } from "@/services/exerciseService";
import { BadgeCheck, Dumbbell, AlertTriangle } from "lucide-react";

function ExerciseStats({ exerciseState, className, sets, onSetsChange, restTime, onRestTimeChange }) {
  const exerciseSettings = EXERCISES[exerciseState.type];
  const isResting = exerciseState.repState === RepState.RESTING;
  const repProgress = exerciseSettings.targetReps > 0
    ? (exerciseState.repCount / exerciseSettings.targetReps) * 100
    : 0;
  const setProgress = sets > 0
    ? ((exerciseState.setCount - 1) / sets) * 100
    : 0;
  const settings = exerciseSettings;
  // const progress = sets > 0 // This variable 'progress' was defined but not used.
  //   ? (exerciseState.setCount / sets) * 100 
  //   : 0;

  return (
    <Card className={cn(className)}> {/* Removed empty string from cn if not needed */}
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-row items-center gap-4">
          <div className="flex items-center min-w-0 font-bold text-xl">
            <Dumbbell className="w-5 h-5 mr-2 text-primary" />
            {exerciseState.type !== ExerciseType.NONE ? (
              <span className="truncate">{settings.name}</span>
            ) : (
              <span>No Exercise Detected</span>
            )}
          </div>
          {exerciseState.type !== ExerciseType.NONE && (
            <div className="flex flex-row items-center gap-4 ml-auto">
              {/* Set Counter Block */}
              <div className="flex items-center gap-1 bg-muted/70 rounded px-2 py-1 text-sm"> {/* Added text-sm here */}
                <span className="font-semibold">Set</span>
                <span className="font-semibold">{exerciseState.setCount}</span>
                <span className="font-normal">of</span>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={sets}
                  onChange={e => onSetsChange(Number(e.target.value))}
                  // Adjusted width to w-10 (40px), padding to px-1 for a tighter fit. Removed inline style.
                  className="w-10 h-7 px-1 py-1 text-sm text-center font-semibold" 
                />
              </div>
              {/* Rest Timer Block */}
              <div className="flex items-center gap-1 bg-muted/70 rounded px-2 py-1 text-sm"> {/* Added text-sm here */}
                <span className="font-semibold">Rest</span>
                <Input
                  type="number"
                  min={5}
                  max={600}
                  value={restTime}
                  onChange={e => onRestTimeChange(Number(e.target.value))}
                  // Adjusted width to w-10 (40px), padding to px-1 for a tighter fit. Removed inline style.
                  className="w-10 h-7 px-1 py-1 text-sm text-center font-semibold"
                />
                <span className="font-semibold">s</span>
              </div>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {exerciseState.type !== ExerciseType.NONE ? (
          <>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">
                    {isResting ? "Rest Time" : "Reps"}
                  </span>
                  <span className="text-sm font-medium">
                    {isResting 
                      ? `${restTime}s` 
                      : `${exerciseState.repCount} / ${settings.targetReps}`}
                  </span>
                </div>
                <Progress value={repProgress} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Sets Completed</span>
                  <span className="text-sm font-medium">
                    {Math.max(0, exerciseState.setCount - 1)} / {sets}
                  </span>
                </div>
                <Progress value={setProgress} className="h-2" />
              </div>
              
              {exerciseState.formFeedback.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-sm font-medium mb-2 flex items-center">
                    {exerciseState.formFeedback.some(f => f.includes('complete') || f.includes('Rest')) 
                      ? <BadgeCheck className="w-4 h-4 mr-1 text-success" />
                      : <AlertTriangle className="w-4 h-4 mr-1 text-warning" />}
                    Feedback
                  </h4>
                  <ul className="space-y-1">
                    {exerciseState.formFeedback.map((feedback, index) => (
                      <li key={index} className="text-sm text-left">
                        • {feedback}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground mt-4">
                <h4 className="font-medium mb-1">Muscles Targeted:</h4>
                <p>{settings.musclesTargeted.join(', ')}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="py-4 text-center text-muted-foreground">
            <p>Get into position to begin tracking your exercise</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExerciseStats;
