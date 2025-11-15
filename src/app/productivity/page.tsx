"use client";

import { useState } from "react";
import { ProductivityTimer } from "@/components/ProductivityTimer";
import { GardenView } from "@/components/GardenView";
import { SessionLog } from "@/components/SessionLog";
import { PlantVisualization } from "@/components/PlantVisualization";
import { Card } from "@/components/ui/card";
import { Sprout, Clock, Leaf } from "lucide-react";
import { toast } from "sonner";

interface CurrentPlant {
  id: number;
  type: string;
  growthStage: number;
  sessionsCompleted: number;
}

export default function ProductivityPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentPlant, setCurrentPlant] = useState<CurrentPlant | null>(null);

  const handleSessionComplete = async (duration: number, sessionType: string) => {
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          duration,
          sessionType,
          completedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save session");
      }

      // Fetch updated plant
      const plantsResponse = await fetch("/api/plants");
      if (plantsResponse.ok) {
        const plants = await plantsResponse.json();
        if (plants.length > 0) {
          const latestPlant = plants[0];
          setCurrentPlant(latestPlant);
          
          // Show growth message
          if (latestPlant.growthStage === 5) {
            toast.success("🌸 Your plant is fully grown! A new seed is planted.");
          } else {
            toast.success(`🌱 Your plant grew! Now at stage ${latestPlant.growthStage + 1}/6`);
          }
        }
      }

      // Trigger refresh for garden and session log
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error saving session:", error);
      toast.error("Failed to save session");
    }
  };

  // Fetch initial plant on mount
  useState(() => {
    fetch("/api/plants")
      .then(res => res.json())
      .then(plants => {
        if (plants.length > 0) {
          setCurrentPlant(plants[0]);
        }
      })
      .catch(err => console.error("Error fetching plants:", err));
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-green-500/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Sprout className="w-10 h-10 text-green-500" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
              Productivity Garden
            </h1>
            <Leaf className="w-10 h-10 text-emerald-600" />
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Focus with intention. Every completed session grows your virtual garden.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-card/50 backdrop-blur-sm border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <div className="font-bold">Pomodoro Timer</div>
                <div className="text-xs text-muted-foreground">25min focus, 5min break</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/50 backdrop-blur-sm border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Sprout className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <div className="font-bold">Plant Growth</div>
                <div className="text-xs text-muted-foreground">6 stages from seed to bloom</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/50 backdrop-blur-sm border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Leaf className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <div className="font-bold">Virtual Garden</div>
                <div className="text-xs text-muted-foreground">5 plant varieties</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timer + Current Plant */}
          <div className="lg:col-span-1 space-y-6">
            <ProductivityTimer onSessionComplete={handleSessionComplete} />
            
            {/* Current Plant Display */}
            {currentPlant && (
              <Card className="p-6 bg-card/50 backdrop-blur-sm">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-center">Current Plant</h3>
                  <div className="flex justify-center">
                    <PlantVisualization
                      type={currentPlant.type}
                      growthStage={currentPlant.growthStage}
                      sessionsCompleted={currentPlant.sessionsCompleted}
                      size="lg"
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <div className="font-semibold capitalize">{currentPlant.type}</div>
                    <div className="text-sm text-muted-foreground">
                      Stage {currentPlant.growthStage + 1}/6
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {currentPlant.sessionsCompleted} session{currentPlant.sessionsCompleted !== 1 ? "s" : ""} completed
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Garden + Session Log */}
          <div className="lg:col-span-2 space-y-6">
            <GardenView refreshTrigger={refreshTrigger} />
            <SessionLog refreshTrigger={refreshTrigger} />
          </div>
        </div>

        {/* How It Works */}
        <Card className="p-6 bg-card/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-green-500 mb-2">🌱 Growing Your Garden</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Complete focus sessions to grow your plant</li>
                <li>• Each session advances your plant by 1 growth stage</li>
                <li>• Plants grow through 6 stages: Seed → Blooming</li>
                <li>• When fully grown, a new plant seed is automatically planted</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-500 mb-2">⏱️ Timer Sessions</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>Focus sessions:</strong> 25 minutes of deep work</li>
                <li>• <strong>Break sessions:</strong> 5 minutes of rest</li>
                <li>• Timer auto-switches between focus and break</li>
                <li>• Only sessions longer than 1 minute are saved</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-emerald-500 mb-2">🌿 Plant Varieties</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>Cactus:</strong> Hardy and resilient</li>
                <li>• <strong>Succulent:</strong> Compact and efficient</li>
                <li>• <strong>Flower:</strong> Beautiful blooms</li>
                <li>• <strong>Tree:</strong> Strong and steadfast</li>
                <li>• <strong>Bamboo:</strong> Flexible and growing</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-purple-500 mb-2">📊 Track Your Progress</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• View your complete session history</li>
                <li>• See total time spent focusing</li>
                <li>• Browse your growing virtual garden</li>
                <li>• Watch plants evolve with each session</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
