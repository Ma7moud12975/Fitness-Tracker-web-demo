import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const dailyChallenge = {
  title: "Daily Challenge",
  description: "Complete 30 squats today!",
  progress: 18, // Example: 18/30
  target: 30,
};

const weeklyChallenge = {
  title: "Weekly Challenge",
  description: "Workout 5 days this week!",
  progress: 3, // Example: 3/5
  target: 5,
};

function ChallengesWidget() {
  return (
    <Card className="bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Challenges</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-medium">{dailyChallenge.title}</span>
            <span className="text-xs text-muted-foreground">{dailyChallenge.progress} / {dailyChallenge.target}</span>
          </div>
          <Progress value={(dailyChallenge.progress / dailyChallenge.target) * 100} className="h-2" />
          <div className="text-xs mt-1 text-muted-foreground">{dailyChallenge.description}</div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-medium">{weeklyChallenge.title}</span>
            <span className="text-xs text-muted-foreground">{weeklyChallenge.progress} / {weeklyChallenge.target}</span>
          </div>
          <Progress value={(weeklyChallenge.progress / weeklyChallenge.target) * 100} className="h-2" />
          <div className="text-xs mt-1 text-muted-foreground">{weeklyChallenge.description}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export { ChallengesWidget };
