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
  status: 'stopped' | 'running' | 'paused' | 'finished';
  speedMultiplier: number;
  selectedCarId: number | null;
  weather: Weather;
}

export interface TrackPoint {
  x: number;
  y: number;
}

// Track JSON Structure
export interface TrackSegment {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  length: number;
  type: 'straight' | 'corner';
  cornerRadius?: number;
  cornerDirection?: 'left' | 'right';
  gripLevel: number; // 0.1 to 1.0
  speedLimit?: number;
  drsZone?: boolean;
  drsStart?: number;
  drsEnd?: number;
}

export interface Obstacle {
  id: number;
  segmentId: number;
  position: number; // 0 to 1 along segment
  type: 'barrier' | 'debris' | 'oil';
  severity: number; // 0.1 to 1.0
}

export interface Hazard {
  id: number;
  segmentId: number;
  position: number; // 0 to 1 along segment
  type: 'rain' | 'wind' | 'temperature';
  intensity: number; // 0.1 to 1.0
  duration: number; // in seconds
}

export interface TrackJSON {
  name: string;
  totalLength: number;
  segments: TrackSegment[];
  obstacles: Obstacle[];
  hazards: Hazard[];
  pitLaneEntry: number;
  pitLaneExit: number;
}

// Driver JSON Structure
export interface DriverStrategy {
  aggression: number; // 0.1 to 1.0
  tireManagement: number; // 0.1 to 1.0
  fuelManagement: number; // 0.1 to 1.0
  overtakingSkill: number; // 0.1 to 1.0
  defensiveSkill: number; // 0.1 to 1.0
  wetWeatherSkill: number; // 0.1 to 1.0
  drsUsage: number; // 0.1 to 1.0
  pitStrategy: {
    initialTire: 'soft' | 'medium' | 'hard';
    targetLaps: number;
    fuelLoad: number; // 0.1 to 1.0
  };
}

export interface Driver {
  id: number;
  name: string; // ChatGPT, Gemini, Qwen
  aiModel: string;
  color: string;
  strategy: DriverStrategy;
}

export interface DriverJSON {
  drivers: Driver[];
}

// Enhanced Car interface for new simulation
export interface RaceCar {
  id: number;
  driverId: number;
  name: string;
  color: string;
  position: { x: number; y: number };
  currentSegment: number;
  segmentProgress: number; // 0 to 1
  speed: number;
  acceleration: number;
  maxSpeed: number;
  tireCompound: 'soft' | 'medium' | 'hard';
  tireWear: number; // 0 to 1
  fuel: number; // 0 to 1
  ers: number; // 0 to 1
  battery: number; // 0 to 1
  distance: number;
  laps: number;
  isInPit: boolean;
  pitStopTime: number;
  angle: number;
  energyConsumption: number;
  overtakes: number;
  positionsLost: number;
  hazardsTriggered: number;
  lapTimes: number[];
  currentTime: number;
  strategy: DriverStrategy;
}

// Race Results
export interface RaceResults {
  winner: Driver;
  finalStandings: Array<{
    driver: Driver;
    position: number;
    laps: number;
    totalTime: number;
    fastestLap: number;
    overtakes: number;
    hazardsTriggered: number;
    tireWear: number;
    fuelRemaining: number;
  }>;
  lapTimes: Array<{
    driver: Driver;
    lap: number;
    time: number;
  }>;
}
