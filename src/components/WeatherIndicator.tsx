"use client";

import { Weather } from '@/types/race';
import { Card } from '@/components/ui/card';
import { Cloud, CloudRain, Wind, Sun } from 'lucide-react';

interface WeatherIndicatorProps {
  weather: Weather;
}

export default function WeatherIndicator({ weather }: WeatherIndicatorProps) {
  const getWeatherIcon = () => {
    switch (weather.type) {
      case 'rain':
        return <CloudRain className="w-5 h-5 text-blue-500" />;
      case 'wind':
        return <Wind className="w-5 h-5 text-gray-500" />;
      default:
        return <Sun className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getWeatherLabel = () => {
    switch (weather.type) {
      case 'rain':
        return 'Rainy';
      case 'wind':
        return 'Windy';
      default:
        return 'Clear';
    }
  };

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {getWeatherIcon()}
        <div>
          <div className="text-sm text-muted-foreground">Weather</div>
          <div className="font-bold">{getWeatherLabel()}</div>
        </div>
        {weather.type !== 'clear' && (
          <div className="ml-auto">
            <div className="text-xs text-muted-foreground">Intensity</div>
            <div className="font-mono font-bold">{(weather.intensity * 100).toFixed(0)}%</div>
          </div>
        )}
      </div>
      {weather.type === 'rain' && (
        <div className="mt-2 text-xs text-blue-500">
          ⚠️ Reduced grip and visibility
        </div>
      )}
      {weather.type === 'wind' && (
        <div className="mt-2 text-xs text-gray-500">
          ⚠️ Affecting car stability
        </div>
      )}
    </Card>
  );
}
