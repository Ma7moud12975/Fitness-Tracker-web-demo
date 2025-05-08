import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Function to get time period
const getTimePeriod = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const App = () => {
  // State for the time period class
  const [timePeriodClass, setTimePeriodClass] = useState('');

  useEffect(() => {
    // Set the initial class based on current time
    setTimePeriodClass(`bg-${getTimePeriod()}`);

    // Optional: Update periodically if the app stays open for long
    // const intervalId = setInterval(() => {
    //   setTimePeriodClass(`bg-${getTimePeriod()}`);
    // }, 60 * 60 * 1000); // Update every hour

    // return () => clearInterval(intervalId); // Cleanup interval
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <TooltipProvider>
          <Toaster />
          <Sonner closeButton />
          {/* Apply dynamic class and keep existing background as fallback */}
          <div 
            className={`fixed inset-0 -z-10 main-background-image ${timePeriodClass} transition-all duration-1000 ease-in-out`}
          ></div> 
          <div className="relative z-10 min-h-screen">
            {/* Main content area */}
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                {/* Add other routes here */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
