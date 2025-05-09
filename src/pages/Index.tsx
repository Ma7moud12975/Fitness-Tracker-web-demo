import React from "react";
import FitnessTracker from "@/components/FitnessTracker/FitnessTracker";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Button } from "@/components/ui/button";
import { CardDescription, CardFooter } from "@/components/ui/card";
import { Dumbbell } from "lucide-react"; // Removed Github from here
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import Chatbot from "@/components/FitnessTracker/Chatbot";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Modarb</h1>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold mb-2">Real-Time Fitness Tracking</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Track your exercises with AI-powered pose detection. Get real-time feedback on your form
              and count repetitions automatically.
            </p>
          </div>

          {/* Fitness Tracker Component */}
          <FitnessTracker />

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <Card>
              <CardHeader>
                <CardTitle>Pose Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  The application uses TensorFlow.js pose detection to track key body landmarks during workouts,
                  providing accurate movement analysis.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Rep Counter</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Automatically counts your exercise repetitions in real-time using AI detection,
                  helping you track your sets and maintain consistent workout records.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Form Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Get immediate feedback on your exercise form to help you perform exercises safely and effectively
                  while maximizing results.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
          Modarb - Web Edition | Based on <a 
              href="https://github.com/a1harfoush/Fitness_Tracker_Pro" 
              className="text-primary hover:underline hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm transition-opacity"
            >
              Modarb
            </a>
          </p>
        </div>
      </footer>
      <Chatbot />
    </div>
  );
};

export default Index;
