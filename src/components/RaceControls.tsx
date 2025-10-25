"use client";

import { RaceState } from '@/types/race';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RaceControlsProps {
  raceState: RaceState;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeedChange: (multiplier: number) => void;
}

export default function RaceControls({
  raceState,
  onStart,
  onPause,
  onReset,
  onSpeedChange,
}: RaceControlsProps) {
  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {raceState.status !== 'running' ? (
            <Button onClick={onStart} size="lg" className="gap-2">
              <Play className="w-4 h-4" />
              {raceState.status === 'stopped' ? 'Start Race' : 'Resume'}
            </Button>
          ) : (
            <Button onClick={onPause} size="lg" variant="secondary" className="gap-2">
              <Pause className="w-4 h-4" />
              Pause
            </Button>
          )}
          <Button onClick={onReset} size="lg" variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium">Speed:</span>
          <Select
            value={raceState.speedMultiplier.toString()}
            onValueChange={(value) => onSpeedChange(parseFloat(value))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
              <SelectItem value="3">3x</SelectItem>
              <SelectItem value="5">5x</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
