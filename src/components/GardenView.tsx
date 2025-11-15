"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PlantCard } from "@/components/PlantVisualization";
import { Loader2, Sprout } from "lucide-react";
import { toast } from "sonner";

interface Plant {
  id: number;
  type: string;
  growthStage: number;
  sessionsCompleted: number;
  createdAt: string;
  updatedAt: string;
}

export const GardenView = ({ refreshTrigger }: { refreshTrigger: number }) => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlants = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/plants");
      
      if (!response.ok) {
        throw new Error("Failed to fetch plants");
      }

      const data = await response.json();
      setPlants(data);
    } catch (error) {
      console.error("Error fetching plants:", error);
      toast.error("Failed to load garden");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, [refreshTrigger]);

  if (isLoading) {
    return (
      <Card className="p-8 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading garden...</span>
        </div>
      </Card>
    );
  }

  if (plants.length === 0) {
    return (
      <Card className="p-8 bg-card/50 backdrop-blur-sm">
        <div className="text-center space-y-3">
          <Sprout className="w-12 h-12 mx-auto text-muted-foreground" />
          <div className="text-muted-foreground">
            Your garden is empty. Complete a session to grow your first plant! 🌱
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Your Garden</h2>
          <div className="text-sm text-muted-foreground">
            {plants.length} plant{plants.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {plants.map((plant) => (
            <PlantCard
              key={plant.id}
              type={plant.type}
              growthStage={plant.growthStage}
              sessionsCompleted={plant.sessionsCompleted}
              createdAt={plant.createdAt}
            />
          ))}
        </div>
      </div>
    </Card>
  );
};
