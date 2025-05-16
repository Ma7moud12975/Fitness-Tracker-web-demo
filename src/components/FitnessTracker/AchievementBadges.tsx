import React from "react";
import { BadgeCheck, Star, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const defaultBadges = [
  {
    id: "first-rep",
    label: "First Rep!",
    description: "Completed your first repetition.",
    icon: <BadgeCheck className="w-6 h-6 text-success" />,
  },
  {
    id: "consistency-star",
    label: "Consistency Star",
    description: "Worked out 3 days in a row.",
    icon: <Star className="w-6 h-6 text-warning" />,
  },
  {
    id: "weekly-warrior",
    label: "Weekly Warrior",
    description: "Completed all weekly challenges.",
    icon: <Award className="w-6 h-6 text-primary" />,
  },
];

function AchievementBadges({ badges }) {
  const displayBadges = badges || defaultBadges;
  return (
    <Card className="bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Achievements</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          {displayBadges.map((badge) => (
            <div key={badge.id} className="flex flex-col items-center p-3 rounded-lg bg-muted/40 shadow">
              {badge.icon}
              <span className="font-semibold mt-2 text-sm">{badge.label}</span>
              <span className="text-xs text-muted-foreground text-center mt-1">{badge.description}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export { AchievementBadges };
