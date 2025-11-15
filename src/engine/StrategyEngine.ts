import { VehicleModel } from './VehicleModel';
import { TrackSegment, Weather } from './PhysicsEngine';

export interface RaceState {
  vehicles: VehicleModel[];
  currentTrack: TrackSegment[];
  weather: Weather;
  elapsedTime: number;
  totalLaps: number;
  currentLap: number;
}

export interface LocalSurroundings {
  ahead: VehicleModel[];
  behind: VehicleModel[];
  nearby: VehicleModel[];
  distanceToNext: number;
  distanceToPrevious: number;
}

export interface StrategyDecision {
  throttle: number; // 0 to 1
  braking: number; // 0 to 1
  steering: number; // -1 to 1
  riskLevel: number; // 0 to 1
  overtakingDecision: 'none' | 'attempt' | 'defend';
  pitDecision: 'none' | 'immediate' | 'next_lap';
  drsActivation: boolean;
  energyManagement: 'aggressive' | 'balanced' | 'conservative';
}

export interface StrategyContext {
  vehicle: VehicleModel;
  raceState: RaceState;
  surroundings: LocalSurroundings;
  currentSegment: TrackSegment;
  weather: Weather;
  battery: number;
  tireWear: number;
  hazards: any[];
  currentLap: number;
  totalLaps: number;
}

export abstract class StrategyEngine {
  // Main decision-making method
  public abstract makeDecision(context: StrategyContext): Promise<StrategyDecision>;

  // Helper methods for common calculations
  protected calculateRiskTolerance(vehicle: VehicleModel, weather: Weather): number {
    let riskTolerance = 0.5; // Base risk level
    
    // Adjust based on vehicle condition
    riskTolerance *= (1 - vehicle.tireWear * 0.3);
    riskTolerance *= vehicle.energyModel.currentLevel;
    
    // Adjust based on weather
    switch (weather.type) {
      case 'rain':
        riskTolerance *= (1 - weather.intensity * 0.5);
        break;
      case 'wind':
        riskTolerance *= (1 - weather.intensity * 0.2);
        break;
    }
    
    return Math.max(0, Math.min(1, riskTolerance));
  }

  protected calculateOptimalSpeed(segment: TrackSegment, vehicle: VehicleModel, weather: Weather): number {
    let targetSpeed = vehicle.maxSpeed;
    
    // Adjust for segment type
    switch (segment.type) {
      case 'corner':
        if (segment.radius) {
          // Calculate maximum cornering speed
          const maxLateralG = segment.grip * 9.81 * (1 - vehicle.tireWear * 0.3);
          const cornerSpeed = Math.sqrt(maxLateralG * segment.radius) * 3.6; // Convert to km/h
          targetSpeed = Math.min(targetSpeed, cornerSpeed);
        }
        break;
      case 'hairpin':
        // Very slow for hairpins
        targetSpeed = Math.min(targetSpeed, 80);
        break;
      case 'chicane':
        // Moderate speed for chicanes
        targetSpeed = Math.min(targetSpeed, vehicle.maxSpeed * 0.7);
        break;
    }
    
    // Adjust for weather
    switch (weather.type) {
      case 'rain':
        targetSpeed *= (1 - weather.intensity * 0.3);
        break;
      case 'wind':
        // Wind effect depends on direction
        if (weather.windDirection) {
          const headwindComponent = Math.cos(weather.windDirection);
          targetSpeed *= (1 - Math.abs(headwindComponent) * weather.intensity * 0.1);
        }
        break;
    }
    
    // Adjust for hazards
    targetSpeed *= (1 - segment.hazardLevel * 0.4);
    
    return targetSpeed;
  }

  protected shouldPit(vehicle: VehicleModel, currentLap: number, totalLaps: number): 'none' | 'immediate' | 'next_lap' {
    // Check tire wear
    if (vehicle.tireWear > 0.85) {
      return currentLap < totalLaps - 2 ? 'immediate' : 'none'; // Don't pit in final laps
    }
    
    // Check battery/fuel
    if (vehicle.energyModel.currentLevel < 0.15) {
      return 'immediate';
    }
    
    // Plan for end of race
    if (currentLap >= totalLaps - 3 && vehicle.tireWear > 0.6) {
      return 'next_lap';
    }
    
    return 'none';
  }

  protected analyzeOvertakingOpportunity(
    vehicle: VehicleModel,
    surroundings: LocalSurroundings,
    currentSegment: TrackSegment,
    riskTolerance: number
  ): 'none' | 'attempt' | 'defend' {
    const vehicleAhead = surroundings.ahead[0];
    
    if (!vehicleAhead) {
      return 'none'; // No one ahead
    }
    
    const distanceToAhead = surroundings.distanceToNext;
    
    // Too far ahead or too close
    if (distanceToAhead > 50 || distanceToAhead < 2) {
      return 'none';
    }
    
    // Check if we're significantly faster
    const speedDifference = vehicle.speed - vehicleAhead.speed;
    if (speedDifference < 5) {
      return 'none'; // Not fast enough to overtake
    }
    
    // Check segment suitability for overtaking
    if (currentSegment.type === 'corner' || currentSegment.type === 'hairpin') {
      return 'none'; // Don't overtake in corners
    }
    
    // Consider risk tolerance
    if (currentSegment.hazardLevel > 0.3 && riskTolerance < 0.7) {
      return 'none';
    }
    
    // Check if we're being defended against
    const vehicleBehind = surroundings.behind[0];
    if (vehicleBehind && surroundings.distanceToPrevious < 10) {
      return 'defend';
    }
    
    return riskTolerance > 0.6 ? 'attempt' : 'none';
  }

  protected calculateEnergyStrategy(
    vehicle: VehicleModel,
    currentLap: number,
    totalLaps: number,
    weather: Weather
  ): 'aggressive' | 'balanced' | 'conservative' {
    const lapsRemaining = totalLaps - currentLap;
    const energyPerLapNeeded = vehicle.energyModel.currentLevel / Math.max(1, lapsRemaining);
    
    // If we have plenty of energy, be more aggressive
    if (energyPerLapNeeded < 0.1) {
      return 'aggressive';
    }
    
    // If energy is tight, be conservative
    if (energyPerLapNeeded > 0.15) {
      return 'conservative';
    }
    
    // Adjust for weather
    if (weather.type === 'rain') {
      return 'conservative'; // Rain requires more energy for traction control
    }
    
    return 'balanced';
  }

  protected calculateSteeringInput(
    vehicle: VehicleModel,
    currentSegment: TrackSegment,
    targetSpeed: number
  ): number {
    // Calculate desired racing line based on segment type
    let targetSteering = 0;
    
    switch (currentSegment.type) {
      case 'corner':
      case 'hairpin':
        if (currentSegment.endX !== undefined && currentSegment.startX !== undefined &&
            currentSegment.endY !== undefined && currentSegment.startY !== undefined) {
          
          const segmentAngle = Math.atan2(
            currentSegment.endY - currentSegment.startY,
            currentSegment.endX - currentSegment.startX
          );
          
          // Simple steering: aim for the racing line
          const angleError = segmentAngle - vehicle.angle;
          targetSteering = Math.max(-1, Math.min(1, angleError / Math.PI));
        }
        break;
        
      case 'chicane':
        // More aggressive steering for chicanes
        targetSteering = Math.sin(vehicle.segmentProgress * Math.PI * 2) * 0.8;
        break;
        
      default:
        // Minimal steering on straights
        targetSteering = 0;
        break;
    }
    
    // Adjust for speed (less steering at high speeds)
    const speedFactor = Math.max(0.3, 1 - (vehicle.speed / vehicle.maxSpeed) * 0.5);
    targetSteering *= speedFactor;
    
    return targetSteering;
  }
}

// Rule-based strategy implementation
export class RuleBasedStrategyEngine extends StrategyEngine {
  public async makeDecision(context: StrategyContext): Promise<StrategyDecision> {
    const { vehicle, surroundings, currentSegment, weather, currentLap, totalLaps } = context;
    
    // Calculate risk tolerance
    const riskTolerance = this.calculateRiskTolerance(vehicle, weather);
    
    // Calculate optimal speed for current conditions
    const targetSpeed = this.calculateOptimalSpeed(currentSegment, vehicle, weather);
    
    // Calculate throttle and braking
    let throttle = 0;
    let braking = 0;
    
    if (vehicle.speed < targetSpeed) {
      throttle = Math.min(1, (targetSpeed - vehicle.speed) / 50); // Scale throttle response
    } else if (vehicle.speed > targetSpeed) {
      braking = Math.min(1, (vehicle.speed - targetSpeed) / 50); // Scale braking response
    }
    
    // Calculate steering
    const steering = this.calculateSteeringInput(vehicle, currentSegment, targetSpeed);
    
    // Make strategic decisions
    const overtakingDecision = this.analyzeOvertakingOpportunity(vehicle, surroundings, currentSegment, riskTolerance);
    const pitDecision = this.shouldPit(vehicle, currentLap, totalLaps);
    const energyManagement = this.calculateEnergyStrategy(vehicle, currentLap, totalLaps, weather);
    
    // DRS activation logic
    const drsActivation = currentSegment.type === 'straight' && 
                         surroundings.distanceToNext > 5 && 
                         surroundings.distanceToNext < 50 &&
                         riskTolerance > 0.5;
    
    // Adjust throttle based on energy management
    switch (energyManagement) {
      case 'conservative':
        throttle *= 0.8;
        break;
      case 'aggressive':
        throttle *= 1.1;
        break;
    }
    
    return {
      throttle: Math.max(0, Math.min(1, throttle)),
      braking: Math.max(0, Math.min(1, braking)),
      steering: Math.max(-1, Math.min(1, steering)),
      riskLevel: riskTolerance,
      overtakingDecision,
      pitDecision,
      drsActivation,
      energyManagement
    };
  }
}

// LLM-based strategy implementation (placeholder for API integration)
export class LLMStrategyEngine extends StrategyEngine {
  private apiEndpoint: string;
  private modelType: string;

  constructor(apiEndpoint: string, modelType: string) {
    super();
    this.apiEndpoint = apiEndpoint;
    this.modelType = modelType;
  }

  public async makeDecision(context: StrategyContext): Promise<StrategyDecision> {
    try {
      // Prepare context data for LLM
      const contextData = {
        vehicle: {
          speed: context.vehicle.speed,
          tireWear: context.vehicle.tireWear,
          energyLevel: context.vehicle.energyModel.currentLevel,
          position: context.vehicle.position
        },
        surroundings: {
          ahead: context.surroundings.ahead.map(v => ({ id: v.id, speed: v.speed, distance: v.distance })),
          behind: context.surroundings.behind.map(v => ({ id: v.id, speed: v.speed, distance: v.distance }))
        },
        segment: {
          type: context.currentSegment.type,
          length: context.currentSegment.length,
          grip: context.currentSegment.grip,
          hazards: context.currentSegment.hazardLevel
        },
        weather: context.weather,
        race: {
          currentLap: context.currentLap,
          totalLaps: context.raceState.totalLaps,
          elapsedTime: context.raceState.elapsedTime
        }
      };

      // Call LLM API
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: contextData,
          modelType: this.modelType,
          requestType: 'strategy_decision'
        })
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const llmDecision = await response.json();

      // Validate and sanitize LLM response
      return {
        throttle: Math.max(0, Math.min(1, llmDecision.throttle || 0.5)),
        braking: Math.max(0, Math.min(1, llmDecision.braking || 0)),
        steering: Math.max(-1, Math.min(1, llmDecision.steering || 0)),
        riskLevel: Math.max(0, Math.min(1, llmDecision.riskLevel || 0.5)),
        overtakingDecision: llmDecision.overtakingDecision || 'none',
        pitDecision: llmDecision.pitDecision || 'none',
        drsActivation: Boolean(llmDecision.drsActivation),
        energyManagement: llmDecision.energyManagement || 'balanced'
      };

    } catch (error) {
      console.error('LLM strategy error, falling back to rule-based:', error);
      
      // Fallback to rule-based strategy
      const fallbackEngine = new RuleBasedStrategyEngine();
      return fallbackEngine.makeDecision(context);
    }
  }
}
