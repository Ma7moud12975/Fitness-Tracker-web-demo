import React from "react";
import { cn } from "@/lib/utils";
import { Dumbbell } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExerciseType, ExerciseState, EXERCISES } from "@/services/exerciseService";
import { AchievementBadges } from "./AchievementBadges";
import { ChallengesWidget } from "./ChallengesWidget";
import { getFormQuality } from "@/utils/exerciseUtils";

const CircularProgress = ({ value, colorClass, label, index }) => {
  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const strokeDashoffset = circumference * (1 - value / 100);


  const gradientId = `progress-gradient-${index}`;

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {/* Background circle */}
          <circle
            cx="70"
            cy="70"
            r={normalizedRadius}
            fill="none"
            stroke="#222a36"
            strokeWidth={stroke + 4}
            strokeLinecap="round"
          />

          {/* Foreground progress circle */}
          <circle
            cx="70"
            cy="70"
            r={normalizedRadius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1s ease-out',
            }}
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-2xl font-bold text-white drop-shadow">
            {value}
          </div>
        </div>
      </div>

      {/* Label with color class */}
      <div className="mt-4 flex items-center gap-2">
        <div className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full text-sm font-semibold",
          colorClass,
          "border-2",
          colorClass.replace('text-', 'border-')
        )}>
          {index + 1}
        </div>
        <span className={cn("font-medium", colorClass)}>
          {label}
        </span>
      </div>
    </div>
  );
};

const getFormScorePercent = (state, sets) => {
  // Only show score after all sets are completed
  if (state.setCount < sets) return 0;
  if (!state.totalReps) return 0;
  return Math.round((state.correctFormCount / state.totalReps) * 100);
};

const ExerciseDashboard = ({ exerciseStates }) => {
  // Get userSets from FitnessTracker if needed, otherwise use EXERCISES
  const exerciseData = Object.entries(exerciseStates)
    .filter(([type]) => type !== ExerciseType.NONE)
    .map(([type, state], index) => {
      const sets = (window.__userSets && window.__userSets[type]) || EXERCISES[type].sets;
      return {
        name: EXERCISES[type].name,
        reps: state.repCount,
        sets: state.setCount,
        formScore: getFormScorePercent(state, sets),
        colorClass: index === 0 ? 'text-red-500' :
                   index === 1 ? 'text-blue-500' :
                   index === 2 ? 'text-green-500' :
                   'text-orange-500',
        type
      };
    });

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Exercise Progress</CardTitle>
          <CardDescription>Form accuracy across exercises</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-center gap-12 py-6">
            {exerciseData.map((data, index) => (
              <CircularProgress
                key={data.type}
                value={data.formScore}
                colorClass={data.colorClass}
                label={data.name}
                index={index}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gamification Widgets */}
      <div className="flex flex-wrap gap-6 justify-center">
        <AchievementBadges />
        <ChallengesWidget />
      </div>

      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Exercise Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Exercise</TableHead>
                <TableHead className="text-right">Total Reps</TableHead>
                <TableHead className="text-right">Sets Completed</TableHead>
                <TableHead className="text-right">Form Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exerciseData.map((data, index) => (
                <TableRow key={data.type} className="hover:bg-transparent">
                  <TableCell className="flex items-center gap-2">
                    <div className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full text-sm font-semibold",
                      data.colorClass,
                      "border-2",
                      data.colorClass.replace('text-', 'border-')
                    )}>
                      {index + 1}
                    </div>
                    <span className="font-medium">
                      {data.name}
                    </span>
                  </TableCell>
                  <TableCell className={cn("text-right font-medium", data.colorClass)}>
                    {data.reps}
                  </TableCell>
                  <TableCell className={cn("text-right font-medium", data.colorClass)}>
                    {data.sets}
                  </TableCell>
                  <TableCell className={cn("text-right font-medium", data.colorClass)}>
                    {data.formScore}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExerciseDashboard;
