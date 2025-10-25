"use client";

import { Car } from '@/types/race';
import { Card } from '@/components/ui/card';
import { Gauge, Battery, Route, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface TelemetryProps {
  car: Car | null;
}

export default function Telemetry({ car }: TelemetryProps) {
  if (!car) {
    return (
      <Card className="p-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="w-5 h-5" />
          <h2 className="text-lg font-bold">Telemetry</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Select a car from the leaderboard to view telemetry
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <Gauge className="w-5 h-5" />
        <h2 className="text-lg font-bold">Telemetry</h2>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: car.color }}
          />
          <div className="font-bold text-lg">{car.name}</div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-sm">
                <Gauge className="w-4 h-4" />
                <span>Speed</span>
              </div>
              <span className="font-mono font-bold">
                {Math.round(car.speed)} km/h
              </span>
            </div>
            <Progress value={(car.speed / car.maxSpeed) * 100} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-sm">
                <Battery className={`w-4 h-4 ${
                  car.battery < 20 ? 'text-red-500' :
                  car.battery < 50 ? 'text-yellow-500' : 'text-green-500'
                }`} />
                <span>Battery</span>
              </div>
              <span className={`font-mono font-bold ${
                car.battery < 20 ? 'text-red-500' :
                car.battery < 50 ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {car.battery.toFixed(1)}%
              </span>
            </div>
            <Progress value={car.battery} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-sm">
                <Route className="w-4 h-4" />
                <span>Distance</span>
              </div>
              <span className="font-mono font-bold">
                {(car.distance / 1000).toFixed(2)} km
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4" />
                <span>Energy Rate</span>
              </div>
              <span className="font-mono font-bold text-orange-500">
                {car.energyConsumption.toFixed(2)} %/km
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Laps Completed</span>
              <span className="font-mono font-bold">{car.laps}</span>
            </div>
          </div>

          {car.isInPit && (
            <div className="p-2 bg-orange-500/20 border border-orange-500 rounded-lg">
              <div className="text-sm font-semibold text-orange-500">
                🔧 PIT STOP IN PROGRESS
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Time: {car.pitStopTime.toFixed(1)}s
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}