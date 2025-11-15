import { VehicleModel } from './VehicleModel';

export interface TrackSegment {
  id: number;
  type: 'straight' | 'corner' | 'chicane' | 'hairpin';
  length: number;
  radius?: number;
  grip: number;
  altitude: number;
  bankAngle: number;
  hazardLevel: number;
  windVector: { x: number; y: number };
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

export interface Weather {
  type: 'clear' | 'rain' | 'wind';
  intensity: number; // 0 to 1
  windDirection?: number; // radians
  temperature?: number; // celsius
}

export interface PhysicsResult {
  speed: number;
  acceleration: number;
  traction: number;
  slipRatio: number;
  dragForce: number;
  batteryDrain: number;
  regenBraking: number;
  maxGripSpeed: number;
}

export class PhysicsEngine {
  private static readonly GRAVITY = 9.81; // m/s²
  private static readonly AIR_DENSITY = 1.225; // kg/m³ at sea level
  private static readonly DRAG_COEFFICIENT_BASE = 0.3; // Typical for race cars

  // Apply physics to a vehicle on a specific segment with current weather
  public static applyPhysics(
    vehicle: VehicleModel,
    segment: TrackSegment,
    weather: Weather,
    deltaTime: number
  ): PhysicsResult {
    // Calculate traction based on tire condition and surface grip
    const traction = this.calculateTraction(vehicle, segment, weather);
    
    // Calculate slip ratio
    const slipRatio = this.calculateSlipRatio(vehicle, traction);
    
    // Calculate drag force
    const dragForce = this.calculateDragForce(vehicle, segment, weather);
    
    // Calculate battery drain
    const batteryDrain = this.calculateBatteryDrain(vehicle, slipRatio, dragForce);
    
    // Calculate regenerative braking potential
    const regenBraking = this.calculateRegenBraking(vehicle, vehicle.speed);
    
    // Calculate maximum grip-limited speed for corners
    const maxGripSpeed = this.calculateMaxGripSpeed(segment, traction, weather);
    
    // Apply physics to determine actual speed and acceleration
    const { speed, acceleration } = this.calculateVehicleDynamics(
      vehicle,
      segment,
      weather,
      traction,
      dragForce,
      deltaTime
    );

    return {
      speed,
      acceleration,
      traction,
      slipRatio,
      dragForce,
      batteryDrain,
      regenBraking,
      maxGripSpeed
    };
  }

  // Calculate traction based on tire, surface, and weather
  private static calculateTraction(
    vehicle: VehicleModel,
    segment: TrackSegment,
    weather: Weather
  ): number {
    let traction = segment.grip * vehicle.gripCoefficient;
    
    // Apply tire wear penalty
    traction *= (1 - vehicle.tireWear * 0.5);
    
    // Apply weather effects
    switch (weather.type) {
      case 'rain':
        traction *= (1 - weather.intensity * 0.4); // Rain reduces grip by up to 40%
        break;
      case 'wind':
        // Wind affects traction slightly, especially crosswinds
        const windEffect = Math.abs(Math.sin(weather.windDirection || 0)) * weather.intensity * 0.1;
        traction *= (1 - windEffect);
        break;
    }
    
    // Apply altitude effects (thinner air at higher altitude)
    const altitudeEffect = Math.max(0.9, 1 - segment.altitude * 0.0001);
    traction *= altitudeEffect;
    
    // Apply banking angle effect (positive banking increases grip)
    if (segment.bankAngle !== 0) {
      const bankingGrip = Math.cos(segment.bankAngle) + Math.sin(segment.bankAngle) * 0.3;
      traction *= bankingGrip;
    }
    
    return Math.max(0.1, Math.min(1.0, traction));
  }

  // Calculate slip ratio based on traction and vehicle dynamics
  private static calculateSlipRatio(vehicle: VehicleModel, traction: number): number {
    const targetSlip = 0.1; // Ideal slip ratio for maximum grip
    const actualSlip = targetSlip * (1 / traction - 1);
    return Math.max(0, Math.min(0.5, actualSlip)); // Cap at 50% slip
  }

  // Calculate aerodynamic drag force
  private static calculateDragForce(
    vehicle: VehicleModel,
    segment: TrackSegment,
    weather: Weather
  ): number {
    const effectiveDragCoefficient = vehicle.dragCoefficient * this.DRAG_COEFFICIENT_BASE;
    const frontalArea = 2.0; // m² (typical for race cars)
    
    // Adjust for wind
    let relativeWindSpeed = vehicle.speed / 3.6; // Convert km/h to m/s
    
    if (weather.type === 'wind' && weather.windDirection !== undefined) {
      const windSpeed = weather.intensity * 20; // Max 20 m/s at intensity 1
      const headwindComponent = Math.cos(weather.windDirection) * windSpeed;
      relativeWindSpeed += headwindComponent;
    }
    
    // Drag force: F = 0.5 * ρ * Cd * A * v²
    const dragForce = 0.5 * this.AIR_DENSITY * effectiveDragCoefficient * frontalArea * Math.pow(relativeWindSpeed, 2);
    
    return dragForce;
  }

  // Calculate battery drain based on driving conditions
  private static calculateBatteryDrain(
    vehicle: VehicleModel,
    slipRatio: number,
    dragForce: number
  ): number {
    let baseDrain = vehicle.energyModel.consumptionRate;
    
    // Increase drain with slip (wheel spin)
    baseDrain *= (1 + slipRatio * 2);
    
    // Increase drain with aerodynamic drag
    const dragPenalty = dragForce / 1000; // Normalize drag force
    baseDrain *= (1 + dragPenalty);
    
    // Increase drain with acceleration
    const accelerationPenalty = Math.max(0, vehicle.acceleration) / vehicle.accelerationProfile.acceleration;
    baseDrain *= (1 + accelerationPenalty * 0.5);
    
    return baseDrain;
  }

  // Calculate regenerative braking potential
  private static calculateRegenBraking(vehicle: VehicleModel, speed: number): number {
    if (vehicle.energyModel.type !== 'battery' || !vehicle.energyModel.regenerationRate) {
      return 0;
    }
    
    // Regen is only effective when braking
    if (vehicle.acceleration >= 0) return 0;
    
    const brakingIntensity = Math.abs(vehicle.acceleration) / vehicle.brakingProfile.deceleration;
    const speedFactor = Math.min(1.0, speed / 100); // Max efficiency at 100 km/h
    
    return vehicle.energyModel.regenerationRate * brakingIntensity * speedFactor;
  }

  // Calculate maximum grip-limited speed for corners
  private static calculateMaxGripSpeed(
    segment: TrackSegment,
    traction: number,
    weather: Weather
  ): number {
    if (segment.type === 'straight') {
      return Infinity; // No grip limit on straights
    }
    
    const radius = segment.radius || 100; // Default radius if not specified
    
    // Maximum lateral acceleration: a = μ * g
    const maxLateralAcceleration = traction * this.GRAVITY;
    
    // Maximum speed: v = sqrt(a * r)
    const maxSpeed = Math.sqrt(maxLateralAcceleration * radius);
    
    // Convert to km/h and apply weather effects
    let maxSpeedKmh = maxSpeed * 3.6;
    
    // Reduce speed in wet conditions
    if (weather.type === 'rain') {
      maxSpeedKmh *= (1 - weather.intensity * 0.3);
    }
    
    return maxSpeedKmh;
  }

  // Calculate vehicle dynamics (speed and acceleration)
  private static calculateVehicleDynamics(
    vehicle: VehicleModel,
    segment: TrackSegment,
    weather: Weather,
    traction: number,
    dragForce: number,
    deltaTime: number
  ): { speed: number; acceleration: number } {
    const maxGripSpeed = this.calculateMaxGripSpeed(segment, traction, weather);
    
    // Determine target speed based on segment and conditions
    let targetSpeed = vehicle.maxSpeed;
    
    // Apply segment-specific limits
    if (segment.type === 'corner' || segment.type === 'hairpin') {
      targetSpeed = Math.min(targetSpeed, maxGripSpeed);
    } else if (segment.type === 'chicane') {
      targetSpeed = Math.min(targetSpeed, maxGripSpeed * 0.8); // More conservative for chicanes
    }
    
    // Apply hazard level
    targetSpeed *= (1 - segment.hazardLevel * 0.3);
    
    // Calculate acceleration needed to reach target speed
    const speedDiff = targetSpeed - vehicle.speed;
    const maxAcceleration = vehicle.accelerationProfile.acceleration * traction;
    const maxDeceleration = vehicle.brakingProfile.deceleration * traction;
    
    let acceleration: number;
    
    if (speedDiff > 0) {
      // Accelerating
      acceleration = Math.min(speedDiff / deltaTime, maxAcceleration);
    } else {
      // Braking
      acceleration = Math.max(speedDiff / deltaTime, -maxDeceleration);
    }
    
    // Apply drag force effect on acceleration
    const dragAcceleration = -dragForce / vehicle.mass;
    acceleration += dragAcceleration;
    
    // Update speed
    const newSpeed = Math.max(0, vehicle.speed + acceleration * deltaTime);
    
    return {
      speed: newSpeed,
      acceleration
    };
  }
}
