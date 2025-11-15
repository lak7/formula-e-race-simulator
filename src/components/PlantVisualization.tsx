"use client";

import { Card } from "@/components/ui/card";
import { Sprout, Leaf, Flower2, TreePine, CircleDot } from "lucide-react";

interface PlantVisualizationProps {
  type: string;
  growthStage: number;
  sessionsCompleted: number;
  size?: "sm" | "md" | "lg";
}

export const PlantVisualization = ({ 
  type, 
  growthStage, 
  sessionsCompleted,
  size = "md" 
}: PlantVisualizationProps) => {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32"
  };

  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  const getPlantIcon = () => {
    switch (type) {
      case "cactus":
        return <CircleDot className={iconSizes[size]} />;
      case "succulent":
        return <Sprout className={iconSizes[size]} />;
      case "flower":
        return <Flower2 className={iconSizes[size]} />;
      case "tree":
        return <TreePine className={iconSizes[size]} />;
      case "bamboo":
        return <Leaf className={iconSizes[size]} />;
      default:
        return <Sprout className={iconSizes[size]} />;
    }
  };

  const getPlantColor = () => {
    switch (type) {
      case "cactus":
        return "text-green-600";
      case "succulent":
        return "text-emerald-500";
      case "flower":
        return "text-pink-500";
      case "tree":
        return "text-green-700";
      case "bamboo":
        return "text-lime-500";
      default:
        return "text-green-500";
    }
  };

  const getOpacity = () => {
    const opacities = [0.3, 0.4, 0.5, 0.7, 0.85, 1.0];
    return opacities[growthStage] || 0.3;
  };

  const getScale = () => {
    const scales = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    return scales[growthStage] || 0.5;
  };

  const plantColor = getPlantColor();

  return (
    <div className="relative flex items-center justify-center">
      <div 
        className={`${sizeClasses[size]} flex items-center justify-center transition-all duration-500`}
        style={{ 
          opacity: getOpacity(),
          transform: `scale(${getScale()})` 
        }}
      >
        <div className={plantColor}>
          {getPlantIcon()}
        </div>
      </div>
      
      {/* Growth dots indicator */}
      <div className="absolute -bottom-2 flex gap-1">
        {[0, 1, 2, 3, 4, 5].map((stage) => (
          <div
            key={stage}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              stage < growthStage 
                ? "bg-green-500" 
                : stage === growthStage
                ? "bg-green-500 animate-pulse"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export const PlantCard = ({ 
  type, 
  growthStage, 
  sessionsCompleted,
  createdAt 
}: { 
  type: string;
  growthStage: number;
  sessionsCompleted: number;
  createdAt: string;
}) => {
  const getGrowthLabel = (stage: number) => {
    const labels = ["Seed", "Sprout", "Seedling", "Young", "Mature", "Blooming"];
    return labels[stage] || "Seed";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors">
      <div className="space-y-3">
        <PlantVisualization 
          type={type}
          growthStage={growthStage}
          sessionsCompleted={sessionsCompleted}
          size="lg"
        />
        
        <div className="text-center space-y-1">
          <div className="font-semibold capitalize">{type}</div>
          <div className="text-sm text-muted-foreground">
            {getGrowthLabel(growthStage)}
          </div>
          <div className="text-xs text-muted-foreground">
            {sessionsCompleted} session{sessionsCompleted !== 1 ? "s" : ""}
          </div>
          <div className="text-xs text-muted-foreground">
            Started {formatDate(createdAt)}
          </div>
        </div>
      </div>
    </Card>
  );
};
