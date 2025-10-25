"use client";

import FormulaERace from '@/components/FormulaERace';
import { Card } from '@/components/ui/card';
import { Zap, Trophy, Gauge, CloudRain } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Zap className="w-10 h-10 text-blue-500" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              Formula E Race Simulator
            </h1>
            <Zap className="w-10 h-10 text-purple-600" />
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Experience real-time 2D racing simulation with physics, battery management, dynamic weather, and pit stop strategy
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card/50 backdrop-blur-sm border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Gauge className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <div className="font-bold">Real Physics</div>
                <div className="text-xs text-muted-foreground">Speed, acceleration, grip</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/50 backdrop-blur-sm border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Zap className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <div className="font-bold">Battery System</div>
                <div className="text-xs text-muted-foreground">Energy management</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/50 backdrop-blur-sm border-orange-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <CloudRain className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <div className="font-bold">Dynamic Weather</div>
                <div className="text-xs text-muted-foreground">Rain, wind effects</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/50 backdrop-blur-sm border-yellow-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <div className="font-bold">Live Tracking</div>
                <div className="text-xs text-muted-foreground">Real-time telemetry</div>
              </div>
            </div>
          </Card>
        </div>

        <FormulaERace />

        <Card className="p-6 bg-card/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold mb-4">How to Use</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-blue-500 mb-2">🏁 Race Controls</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Click <strong>Start Race</strong> to begin the simulation</li>
                <li>• Use <strong>Pause</strong> to temporarily stop the race</li>
                <li>• Click <strong>Reset</strong> to start over with new positions</li>
                <li>• Adjust <strong>Speed multiplier</strong> (0.5x to 5x) for faster races</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-green-500 mb-2">⚡ Energy Management</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Each car has a <strong>battery</strong> that depletes with use</li>
                <li>• Higher speeds consume more energy</li>
                <li>• Cars automatically pit stop when battery is low (&lt;15%)</li>
                <li>• Pit stops take 3 seconds and recharge at 15%/sec</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-purple-500 mb-2">📊 Telemetry & Tracking</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Click any car in the <strong>leaderboard</strong> to view details</li>
                <li>• Monitor speed, battery, distance, and energy rate</li>
                <li>• Leaderboard ranks by laps completed and distance</li>
                <li>• Watch the track to see car positions in real-time</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-orange-500 mb-2">🌦️ Weather System</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Weather changes randomly during the race</li>
                <li>• <strong>Rain</strong> reduces grip and increases energy use</li>
                <li>• <strong>Wind</strong> affects car stability and speed</li>
                <li>• Weather intensity varies from 30% to 80%</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}