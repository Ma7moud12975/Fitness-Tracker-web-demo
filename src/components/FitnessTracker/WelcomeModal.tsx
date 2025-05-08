
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center text-center">
            <Dumbbell className="h-6 w-6 text-primary mr-2" />
            Welcome to Modarb
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Your AI-powered workout assistant
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <p className="text-sm">
          Modarb uses your webcam and AI to:
          </p>
          
          <ul className="space-y-2">
            {[
              "Track your exercises in real-time",
              "Count repetitions automatically",
              "Analyze your form and provide feedback",
              "Monitor your workout progress"
            ].map((feature, index) => (
              <li key={index} className="flex items-start text-sm">
                <span className="bg-primary/10 text-primary font-medium rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">
                  {index + 1}
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          
          <div className="bg-muted p-3 rounded-md text-sm mt-4">
            <p className="font-medium mb-1">Privacy Note:</p>
            <p>
              All processing happens locally in your browser. No video data is 
              stored or sent to any server.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeModal;
