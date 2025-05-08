
import React from "react";
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ExerciseType, ExerciseState, EXERCISES } from "@/services/exerciseService";

type ExerciseDashboardProps = {
  exerciseStates: Record<ExerciseType, ExerciseState>;
}

const ExerciseDashboard: React.FC<ExerciseDashboardProps> = ({ exerciseStates }) => {
  const chartData = Object.entries(exerciseStates)
    .filter(([type]) => type !== ExerciseType.NONE)
    .map(([type, state]) => ({
      name: EXERCISES[type as ExerciseType].name,
      reps: state.totalReps,
      sets: state.setCount, // This now correctly represents completed sets
    }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Exercise Performance</CardTitle>
          <CardDescription>Track your progress across different exercises</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="reps" fill="var(--primary)" name="Total Reps" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exercise Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exercise</TableHead>
                <TableHead>Total Reps</TableHead>
                <TableHead>Sets Completed</TableHead>
                <TableHead>Form Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(exerciseStates)
                .filter(([type]) => type !== ExerciseType.NONE)
                .map(([type, state]) => (
                  <TableRow key={type}>
                    <TableCell className="font-medium">
                      {EXERCISES[type as ExerciseType].name}
                    </TableCell>
                    <TableCell>{state.totalReps}</TableCell>
                    {/* This now correctly displays completed sets */}
                    <TableCell>{state.setCount}</TableCell> 
                    <TableCell>
                      {Math.round((state.correctFormCount / Math.max(state.totalReps, 1)) * 100)}%
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
