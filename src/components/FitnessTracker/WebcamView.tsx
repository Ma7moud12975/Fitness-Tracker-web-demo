
import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * @typedef {Object} WebcamViewProps
 * @property {string} [className]
 * @property {(imageData: ImageData) => void} [onFrame]
 * @property {number} [width]
 * @property {number} [height]
 * @property {boolean} [drawCanvas]
 * @property {React.RefObject<HTMLCanvasElement>} [canvasRef]
 */

const WebcamView = ({
  className,
  onFrame,
  width = 640,
  height = 480,
  drawCanvas = true,
  canvasRef: externalCanvasRef,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        setIsLoading(true);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width, 
            height,
            facingMode: "user",
            // Request optimal settings for smooth movement
            frameRate: { ideal: 30 }
          },
          audio: false,
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsLoading(false);
            setHasPermission(true);
          };
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        setHasPermission(false);
        setIsLoading(false);
      }
    }

    setupCamera();

    return () => {
      // Clean up video stream on unmount
      const stream = videoRef.current && videoRef.current.srcObject;
      if (stream && typeof stream.getTracks === "function") {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Cancel any pending animation frames
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [width, height]);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !hasPermission || !onFrame) return;

    // Create a more efficient capture frame function with throttling
    let lastFrameTime = 0;
    const frameDuration = 1000 / 30; // Target 30fps
    
    const captureFrame = (timestamp) => {
      // Throttle frame capture to maintain consistent frame rate
      if (timestamp - lastFrameTime >= frameDuration) {
        lastFrameTime = timestamp;
        
        const ctx = canvasRef.current?.getContext("2d", { willReadFrequently: true });
        if (!ctx || !videoRef.current) return;

        // Draw the video frame to the canvas
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        
        // If we need to process the frame, get the ImageData and call onFrame
        if (onFrame) {
          const imageData = ctx.getImageData(0, 0, width, height);
          onFrame(imageData);
        }
      }
      
      // Continue capturing frames
      animationRef.current = requestAnimationFrame(captureFrame);
    };

    // Start capturing frames
    animationRef.current = requestAnimationFrame(captureFrame);
    
    // Clean up
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [hasPermission, onFrame, width, height, drawCanvas]);

  return (
    <div className={cn("relative", className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white z-10">
          Loading camera...
        </div>
      )}
      
      {hasPermission === false && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive bg-opacity-20 text-destructive z-10 p-4 text-center">
          <div>
            <p className="font-bold text-lg">Camera access denied</p>
            <p className="text-sm">Please allow camera access to use the fitness tracker</p>
          </div>
        </div>
      )}
      
      <video 
        ref={videoRef} 
        className={cn(
          "w-full h-auto rounded-lg",
          (!drawCanvas || !hasPermission) ? "block" : "hidden"
        )} 
        width={width}
        height={height}
        playsInline
        muted
      />
      
      <canvas 
        ref={canvasRef} 
        className={cn(
          "w-full h-auto rounded-lg", 
          drawCanvas && hasPermission ? "block" : "hidden"
        )} 
        width={width} 
        height={height}
      />
    </div>
  );
};

export default WebcamView;
