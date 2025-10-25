"use client";

import { Car } from '@/types/race';
import { Card } from '@/components/ui/card';
import { Trophy, Zap } from 'lucide-react';

interface LeaderboardProps {
  cars: Car[];
  onCarSelect: (carId: number) => void;
  selectedCarId: number | null;
}

export default function Leaderboard({ cars, onCarSelect, selectedCarId }: LeaderboardProps) {
  const sortedCars = [...cars].sort((a, b) => {
    if (a.laps !== b.laps) return b.laps - a.laps;
    return b.distance - a.distance;
  });

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h2 className="text-lg font-bold">Leaderboard</h2>
      </div>
      <div className="space-y-2">
        {sortedCars.map((car, index) => (
          <button
            key={car.id}
            onClick={() => onCarSelect(car.id)}
            className={`w-full text-left p-3 rounded-lg transition-all ${
              selectedCarId === car.id
                ? 'bg-primary/20 border-2 border-primary'
                : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-xl font-bold text-muted-foreground w-6">
                  {index + 1}
                </div>
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: car.color }}
                />
                <div>
                  <div className="font-semibold">{car.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Lap {car.laps} • {Math.round(car.distance)}m
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className={`font-mono text-sm ${
                  car.battery < 20 ? 'text-red-500' :
                  car.battery < 50 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {car.battery.toFixed(0)}%
                </span>
              </div>
            </div>
            {car.isInPit && (
              <div className="mt-1 text-xs text-orange-500 font-semibold">
                🔧 PIT STOP ({car.pitStopTime.toFixed(1)}s)
              </div>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}
