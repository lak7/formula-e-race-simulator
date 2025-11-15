// Extended track schema for the modular simulation engine

import { VehicleBehaviorType } from '../engine/VehicleModel';

export type SegmentType = 'straight' | 'corner' | 'chicane' | 'hairpin' | 's-curve' | 'double-apex' | 'fast-sweep' | 'slow-sweep';

export type WeatherType = 'sunny' | 'cloudy' | 'light-rain' | 'heavy-rain' | 'storm' | 'fog' | 'snow';

export type WindDirection = 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';

export interface WindVector {
  direction: WindDirection;
  speed: number; // km/h
  gustiness: number; // 0-1, how variable the wind is
}

export interface ExtendedTrackSegment {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  length: number; // meters
  
  // Enhanced segment types
  type: SegmentType;
  
  // Corner properties (only for corner types)
  cornerRadius?: number;
  cornerDirection?: 'left' | 'right';
  cornerApex?: number; // 0-1, where the apex is in the corner
  cornerEntryAngle?: number; // degrees
  cornerExitAngle?: number; // degrees
  
  // Surface properties
  gripLevel: number; // 0-1
  surfaceType: 'asphalt' | 'concrete' | 'tarmac' | 'gravel' | 'grass' | 'wet';
  surfaceCondition: 'dry' | 'damp' | 'wet' | 'flooded' | 'icy';
  
  // Elevation and banking
  altitude: number; // meters above sea level
  altitudeChange: number; // meters change over segment
  bankAngle: number; // degrees, positive for left banking
  
  // Speed and DRS
  speedLimit?: number; // km/h
  drsZone?: boolean;
  drsStart?: number; // 0-1, relative position in segment
  drsEnd?: number; // 0-1, relative position in segment
  
  // Environmental factors
  hazardLevel: number; // 0-1, likelihood of hazards
  windVector?: WindVector;
  temperature?: number; // Celsius
  humidity?: number; // 0-100%
  
  // Visibility
  visibility?: number; // meters
  lighting?: 'day' | 'night' | 'twilight' | 'artificial';
  
  // Track features
  curbs?: {
    inside: boolean;
    outside: boolean;
    height: number; // cm
    aggressiveness: number; // 0-1
  };
  
  // Runoff areas
  runoffArea?: {
    inside: boolean;
    outside: boolean;
    surface: 'gravel' | 'grass' | 'asphalt' | 'sand';
    width: number; // meters
  };
  
  // Strategic elements
  overtakingOpportunity: number; // 0-1, how good the overtaking spot is
  defensiveDifficulty: number; // 0-1, how hard to defend here
  
  // Physics modifiers
  dragMultiplier?: number; // for tunnels, etc.
  gripMultiplier?: number; // for special surfaces
  energyConsumptionMultiplier?: number; // for steep climbs, etc.
}

export interface TrackObstacle {
  id: number;
  segmentId: number;
  position: number; // 0-1, relative position in segment
  type: 'barrier' | 'debris' | 'oil' | 'water' | 'gravel' | 'animal' | 'vehicle';
  severity: number; // 0-1, how dangerous it is
  duration?: number; // seconds, if temporary
  size?: {
    width: number; // meters
    height: number; // meters
    length: number; // meters
  };
  avoidable: boolean; // whether it can be avoided
}

export interface TrackHazard {
  id: number;
  segmentId: number;
  position: number; // 0-1, relative position in segment
  type: 'rain' | 'wind' | 'fog' | 'snow' | 'ice' | 'dust' | 'heat';
  intensity: number; // 0-1
  duration: number; // seconds
  affectedLanes?: number[]; // which lanes are affected
  movement?: {
    direction: WindDirection;
    speed: number; // km/h
  };
}

export interface DRSZone {
  id: number;
  startSegmentId: number;
  endSegmentId: number;
  startPosition: number; // 0-1 in start segment
  endPosition: number; // 0-1 in end segment
  activationCondition: {
    gapBehind: number; // seconds
    detectionPoint: number; // segment ID
  };
}

export interface PitLane {
  entrySegmentId: number;
  exitSegmentId: number;
  speedLimit: number; // km/h
  length: number; // meters
  pitStops: number; // maximum number of pit boxes
}

export interface WeatherProfile {
  initialWeather: WeatherType;
  changeProbability: number; // probability per minute
  possibleWeathers: WeatherType[];
  transitions: {
    [from in WeatherType]: {
      [to in WeatherType]: number; // probability
    };
  };
  effects: {
    [weather in WeatherType]: {
      gripMultiplier: number;
      visibilityMultiplier: number;
      energyConsumptionMultiplier: number;
      tireWearMultiplier: number;
    };
  };
}

export interface ExtendedTrackJSON {
  // Basic track information
  name: string;
  location: string;
  country: string;
  length: number; // total track length in meters
  numberOfLaps: number;
  raceDistance: number; // total race distance in meters
  
  // Track segments
  segments: ExtendedTrackSegment[];
  
  // DRS zones
  drsZones: DRSZone[];
  
  // Pit lane
  pitLane: PitLane;
  
  // Obstacles and hazards
  obstacles: TrackObstacle[];
  hazards: TrackHazard[];
  
  // Weather profile
  weatherProfile: WeatherProfile;
  
  // Track characteristics
  characteristics: {
    averageGrip: number;
    averageSpeed: number;
    overtakingDifficulty: number;
    tireWearRate: number;
    fuelConsumptionRate: number;
    technicalDifficulty: number; // 0-1
  };
  
  // Metadata
  metadata: {
    version: string;
    author: string;
    created: string;
    modified: string;
    tags: string[];
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    vehicleTypes: VehicleBehaviorType[];
  };
}

// Vehicle behavior types (re-export from VehicleModel)
export { VehicleBehaviorType };

// Helper functions for track processing
export class TrackProcessor {
  static calculateTotalLength(segments: ExtendedTrackSegment[]): number {
    return segments.reduce((total, segment) => total + segment.length, 0);
  }

  static getSegmentAtDistance(segments: ExtendedTrackSegment[], distance: number): { segment: ExtendedTrackSegment; position: number } {
    let accumulatedDistance = 0;
    
    for (const segment of segments) {
      if (distance <= accumulatedDistance + segment.length) {
        return {
          segment,
          position: (distance - accumulatedDistance) / segment.length
        };
      }
      accumulatedDistance += segment.length;
    }
    
    // If distance is beyond track length, return last segment
    return {
      segment: segments[segments.length - 1],
      position: 1.0
    };
  }

  static getSegmentsBetween(segments: ExtendedTrackSegment[], startDistance: number, endDistance: number): ExtendedTrackSegment[] {
    const result: ExtendedTrackSegment[] = [];
    let accumulatedDistance = 0;
    
    for (const segment of segments) {
      const segmentEnd = accumulatedDistance + segment.length;
      
      if (segmentEnd > startDistance && accumulatedDistance < endDistance) {
        result.push(segment);
      }
      
      accumulatedDistance = segmentEnd;
      
      if (accumulatedDistance >= endDistance) {
        break;
      }
    }
    
    return result;
  }

  static findDRSZones(segments: ExtendedTrackSegment[], drsZones: DRSZone[], distance: number): DRSZone | null {
    const { segment, position } = this.getSegmentAtDistance(segments, distance);
    
    return drsZones.find(zone => {
      const zoneStart = this.getSegmentAtDistance(segments, zone.startSegmentId * 1000).segment.length * zone.startPosition;
      const zoneEnd = this.getSegmentAtDistance(segments, zone.endSegmentId * 1000).segment.length * zone.endPosition;
      
      return distance >= zoneStart && distance <= zoneEnd;
    }) || null;
  }

  static getObstaclesAt(segments: ExtendedTrackSegment[], obstacles: TrackObstacle[], distance: number): TrackObstacle[] {
    const { segment } = this.getSegmentAtDistance(segments, distance);
    
    return obstacles.filter(obstacle => obstacle.segmentId === segment.id);
  }

  static getHazardsAt(segments: ExtendedTrackSegment[], hazards: TrackHazard[], distance: number): TrackHazard[] {
    const { segment } = this.getSegmentAtDistance(segments, distance);
    
    return hazards.filter(hazard => hazard.segmentId === segment.id);
  }

  static calculateTrackDifficulty(track: ExtendedTrackJSON): number {
    const { characteristics, segments } = track;
    
    // Base difficulty from track characteristics
    let difficulty = (characteristics.technicalDifficulty * 0.4) + 
                    (characteristics.overtakingDifficulty * 0.3) + 
                    (characteristics.tireWearRate * 0.2) + 
                    (characteristics.fuelConsumptionRate * 0.1);
    
    // Add difficulty from corner complexity
    const cornerComplexity = segments
      .filter(s => s.type === 'corner')
      .reduce((total, segment) => {
        const cornerDifficulty = (segment.gripLevel < 0.5 ? 0.3 : 0) +
                                (segment.bankAngle > 15 ? 0.2 : 0) +
                                (segment.altitudeChange > 10 ? 0.1 : 0);
        return total + cornerDifficulty;
      }, 0) / segments.length;
    
    difficulty += cornerComplexity * 0.2;
    
    return Math.min(1.0, difficulty);
  }
}
