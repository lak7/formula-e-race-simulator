"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Coffee, Focus } from "lucide-react";
import { toast } from "sonner";

interface ProductivityTimerProps {
  onSessionComplete: (duration: number, sessionType: string) => void;
}

export const ProductivityTimer = ({ onSessionComplete }: ProductivityTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState<"focus" | "break">("focus");
  const [sessionDuration, setSessionDuration] = useState(25 * 60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleSessionComplete = () => {
    setIsRunning(false);
    const completedDuration = sessionDuration - timeLeft;
    
    if (completedDuration >= 60) { // Only save sessions longer than 1 minute
      onSessionComplete(completedDuration, sessionType);
      toast.success(`${sessionType === "focus" ? "Focus" : "Break"} session complete! 🌱`);
    }

    // Auto-switch to break/focus
    const nextType = sessionType === "focus" ? "break" : "focus";
    const nextDuration = nextType === "focus" ? 25 * 60 : 5 * 60;
    
    setSessionType(nextType);
    setSessionDuration(nextDuration);
    setTimeLeft(nextDuration);
  };

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    const duration = sessionType === "focus" ? 25 * 60 : 5 * 60;
    setSessionDuration(duration);
    setTimeLeft(duration);
  };

  const handleSwitchMode = (mode: "focus" | "break") => {
    setIsRunning(false);
    setSessionType(mode);
    const duration = mode === "focus" ? 25 * 60 : 5 * 60;
    setSessionDuration(duration);
    setTimeLeft(duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = ((sessionDuration - timeLeft) / sessionDuration) * 100;

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm">
      <div className="space-y-6">
        {/* Mode Selector */}
        <div className="flex gap-2 justify-center">
          <Button
            variant={sessionType === "focus" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSwitchMode("focus")}
            disabled={isRunning}
          >
            <Focus className="w-4 h-4 mr-2" />
            Focus (25min)
          </Button>
          <Button
            variant={sessionType === "break" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSwitchMode("break")}
            disabled={isRunning}
          >
            <Coffee className="w-4 h-4 mr-2" />
            Break (5min)
          </Button>
        </div>

        {/* Timer Display */}
        <div className="relative">
          <div className="text-center">
            <div className="text-7xl font-bold tabular-nums tracking-tight">
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {sessionType === "focus" ? "Focus Session" : "Break Time"}
            </div>
          </div>

          {/* Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -z-10" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted/20"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
              strokeLinecap="round"
              className={sessionType === "focus" ? "text-blue-500" : "text-green-500"}
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
          </svg>
        </div>

        {/* Controls */}
        <div className="flex gap-2 justify-center">
          {!isRunning ? (
            <Button onClick={handleStart} size="lg">
              <Play className="w-5 h-5 mr-2" />
              Start
            </Button>
          ) : (
            <Button onClick={handlePause} size="lg" variant="secondary">
              <Pause className="w-5 h-5 mr-2" />
              Pause
            </Button>
          )}
          <Button onClick={handleReset} size="lg" variant="outline">
            <RotateCcw className="w-5 h-5 mr-2" />
            Reset
          </Button>
        </div>
      </div>
    </Card>
  );
};
