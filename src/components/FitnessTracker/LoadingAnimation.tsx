
import React from "react";
import { cn } from "@/lib/utils";
// Removed: import { Dumbbell } from "lucide-react";

interface LoadingAnimationProps {
  message?: string;
  className?: string;
}

// Define keyframes for the heart beat animation in your global CSS (e.g., src/index.css)
/*
@keyframes heartBeat {
  0% { transform: scale(1); }
  14% { transform: scale(1.3); }
  28% { transform: scale(1); }
  42% { transform: scale(1.3); }
  70% { transform: scale(1); }
}
*/

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ 
  message = "Loading...", 
  className 
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-6", 
      className
    )}>
      {/* Replace Dumbbell and spinner with Heart SVG */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className="w-12 h-12 mb-4 text-primary animate-[heartBeat_1s_ease-in-out_infinite]" // Apply Tailwind animation
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      <p className="text-muted-foreground text-sm animate-pulse">{message}</p>
    </div>
  );
};

export default LoadingAnimation;
