export interface Car {
  id: number;
  name: string;
  color: string;
  position: { x: number; y: number };
  speed: number;
  acceleration: number;
  battery: number;
  distance: number;
  laps: number;
  isInPit: boolean;
  pitStopTime: number;
  angle: number;
  maxSpeed: number;
  energyConsumption: number;
}

export interface Weather {
  type: 'clear' | 'rain' | 'wind';
  intensity: number;
  windDirection?: number;
}

export interface RaceState {
  status: 'stopped' | 'running' | 'paused';
  speedMultiplier: number;
  selectedCarId: number | null;
  weather: Weather;
}

export interface TrackPoint {
  x: number;
  y: number;
}
