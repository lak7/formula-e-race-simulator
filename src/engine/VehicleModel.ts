export enum VehicleBehaviorType {
  CAR = "car",
  DRONE = "drone", 
  BIKE = "bike",
  BOAT = "boat",
  TRUCK = "truck"
}

export interface EnergyModel {
  type: 'battery' | 'fuel';
  capacity: number; // Total capacity (0-1 normalized)
  currentLevel: number; // Current level (0-1)
  consumptionRate: number; // Base consumption per meter
  regenerationRate?: number; // Regeneration rate (for electric vehicles)
}

export interface PerformanceProfile {
  acceleration: number; // m/s²
  deceleration: number; // m/s²
  maxSpeed: number; // km/h
  turningRadius: number; // meters
}

export class VehicleModel {
  public readonly id: number;
  public readonly name: string;
  public readonly behaviorType: VehicleBehaviorType;
  
  // Physical properties
  public readonly mass: number; // kg
  public readonly maxSpeed: number; // km/h
  public readonly accelerationProfile: PerformanceProfile;
  public readonly brakingProfile: PerformanceProfile;
  public readonly turningRadius: number; // meters
  public readonly dragCoefficient: number;
  public readonly gripCoefficient: number;
  
  // Energy system
  public energyModel: EnergyModel;
  
  // AI agent reference
  public agentId?: number;
  
  // Runtime state
  public position: { x: number; y: number };
  public velocity: { x: number; y: number };
  public speed: number; // km/h
  public acceleration: number; // m/s²
  public angle: number; // radians
  public currentSegment: number;
  public segmentProgress: number; // 0 to 1
  public distance: number; // total distance traveled
  public laps: number;
  
  // Race-specific state
  public tireCompound: 'soft' | 'medium' | 'hard';
  public tireWear: number; // 0 to 1
  public isInPit: boolean;
  public pitStopTime: number;
  public overtakes: number;
  public positionsLost: number;
  public hazardsTriggered: number;
  public lapTimes: number[];
  public currentTime: number;

  constructor(config: {
    id: number;
    name: string;
    behaviorType: VehicleBehaviorType;
    mass: number;
    maxSpeed: number;
    accelerationProfile: PerformanceProfile;
    brakingProfile: PerformanceProfile;
    turningRadius: number;
    dragCoefficient: number;
    gripCoefficient: number;
    energyModel: EnergyModel;
    agentId?: number;
  }) {
    this.id = config.id;
    this.name = config.name;
    this.behaviorType = config.behaviorType;
    this.mass = config.mass;
    this.maxSpeed = config.maxSpeed;
    this.accelerationProfile = config.accelerationProfile;
    this.brakingProfile = config.brakingProfile;
    this.turningRadius = config.turningRadius;
    this.dragCoefficient = config.dragCoefficient;
    this.gripCoefficient = config.gripCoefficient;
    this.energyModel = { ...config.energyModel };
    this.agentId = config.agentId;
    
    // Initialize runtime state
    this.position = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.speed = 0;
    this.acceleration = 0;
    this.angle = 0;
    this.currentSegment = 0;
    this.segmentProgress = 0;
    this.distance = 0;
    this.laps = 0;
    
    // Race-specific state
    this.tireCompound = 'medium';
    this.tireWear = 0;
    this.isInPit = false;
    this.pitStopTime = 0;
    this.overtakes = 0;
    this.positionsLost = 0;
    this.hazardsTriggered = 0;
    this.lapTimes = [];
    this.currentTime = 0;
  }

  // Update vehicle state based on physics and control inputs
  public updateState(deltaTime: number, controlInputs: {
    throttle: number; // 0 to 1
    braking: number; // 0 to 1
    steering: number; // -1 to 1
  }): void {
    // Apply acceleration/deceleration
    const targetAcceleration = (controlInputs.throttle - controlInputs.braking) * this.accelerationProfile.acceleration;
    this.acceleration = targetAcceleration;
    
    // Update speed
    const speedChange = this.acceleration * deltaTime;
    this.speed = Math.max(0, Math.min(this.maxSpeed, this.speed + speedChange * 3.6)); // Convert to km/h
    
    // Update position based on velocity
    const distanceTraveled = this.speed * (deltaTime / 3.6); // Convert km/h to m/s
    this.distance += distanceTraveled;
    
    // Update energy consumption
    const energyConsumption = this.energyModel.consumptionRate * distanceTraveled * (1 + controlInputs.throttle * 0.5);
    this.energyModel.currentLevel = Math.max(0, this.energyModel.currentLevel - energyConsumption);
    
    // Apply regenerative braking if applicable
    if (this.energyModel.regenerationRate && controlInputs.braking > 0) {
      const regeneration = this.energyModel.regenerationRate * distanceTraveled * controlInputs.braking;
      this.energyModel.currentLevel = Math.min(1, this.energyModel.currentLevel + regeneration);
    }
    
    // Update tire wear
    const tireWearRate = 0.00001 * (1 + Math.abs(controlInputs.throttle) * 0.5) * (1 + Math.abs(controlInputs.steering) * 0.3);
    this.tireWear = Math.min(1, this.tireWear + tireWearRate * distanceTraveled);
  }

  // Check if vehicle can continue racing
  public canRace(): boolean {
    return this.energyModel.currentLevel > 0.05 && this.tireWear < 0.95;
  }

  // Get vehicle snapshot for UI rendering
  public getSnapshot() {
    return {
      id: this.id,
      name: this.name,
      position: { ...this.position },
      speed: this.speed,
      angle: this.angle,
      currentSegment: this.currentSegment,
      segmentProgress: this.segmentProgress,
      distance: this.distance,
      laps: this.laps,
      energyLevel: this.energyModel.currentLevel,
      tireWear: this.tireWear,
      isInPit: this.isInPit,
      overtakes: this.overtakes,
      positionsLost: this.positionsLost
    };
  }
}
