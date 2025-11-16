import { VehicleModel, VehicleBehaviorType, EnergyModel, PerformanceProfile } from './VehicleModel';
import { EventManager, EventType, SimulationEvent } from './EventManager';
import { PhysicsEngine, TrackSegment, Weather } from './PhysicsEngine';
import { StrategyEngine, StrategyDecision, RaceState, LocalSurroundings, StrategyContext, RuleBasedStrategyEngine } from './StrategyEngine';

export interface SimulationConfig {
  fixedTimestep: number; // Fixed timestep in seconds
  speedMultiplier: number;
  totalLaps: number;
  weatherProfile: {
    initialWeather: Weather;
    changeProbability: number; // Probability of weather change per minute
  };
  eventProbabilities: {
    breakdown: number; // Per vehicle per minute
    obstacleAppear: number; // Per minute
    batteryLow: number; // Per vehicle per minute when battery < 20%
    collision: number; // Per vehicle pair per minute when close
  };
}

export interface SimulationSnapshot {
  timestamp: number;
  elapsedTime: number;
  raceState: 'stopped' | 'running' | 'paused' | 'finished';
  vehicles: Array<{
    id: number;
    name: string;
    position: { x: number; y: number };
    speed: number;
    angle: number;
    currentSegment: number;
    segmentProgress: number;
    distance: number;
    laps: number;
    energyLevel: number;
    tireWear: number;
    isInPit: boolean;
    overtakes: number;
    positionsLost: number;
  }>;
  weather: Weather;
  currentLap: number;
  totalLaps: number;
  events: SimulationEvent[];
}

export type StateUpdateCallback = (snapshot: SimulationSnapshot) => void;

export class SimulationEngine {
  private config: SimulationConfig;
  private eventManager: EventManager;
  private vehicles: VehicleModel[] = [];
  private track: TrackSegment[] = [];
  private weather: Weather;
  private speedMultiplier: number = 1;
  private isRunning = false;
  private isPaused = false;
  private elapsedTime = 0;
  private currentLap = 0;
  private lastUpdateTime = 0;
  private accumulatedTime = 0;
  private stateUpdateCallback?: StateUpdateCallback;
  private animationFrameId?: number;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.eventManager = new EventManager();
    this.weather = { ...config.weatherProfile.initialWeather };
    
    // Subscribe to events
    this.setupEventSubscriptions();
  }

  // Initialize simulation with vehicles and track
  public initialize(
    vehiclesConfig: Array<{
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
    }>,
    track: TrackSegment[]
  ): void {
    this.vehicles = vehiclesConfig.map(config => new VehicleModel(config));
    this.track = track;
    
    // Position vehicles at start
    this.positionVehiclesAtStart();
    
    // Reset simulation state
    this.elapsedTime = 0;
    this.currentLap = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.accumulatedTime = 0;
  }

  // Set callback for state updates
  public setStateUpdateCallback(callback: StateUpdateCallback): void {
    this.stateUpdateCallback = callback;
  }

  // Start simulation
  public start(): void {
    if (!this.isRunning && this.vehicles.length > 0) {
      this.isRunning = true;
      this.isPaused = false;
      this.lastUpdateTime = performance.now();
      this.gameLoop();
    }
  }

  // Pause the simulation
  public pause(): void {
    this.isPaused = true;
  }

  // Resume the simulation
  public resume(): void {
    if (!this.isRunning) return;
    
    this.isPaused = false;
    this.lastUpdateTime = performance.now();
    this.gameLoop();
  }

  // Stop the simulation
  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  // Reset the simulation
  public reset(): void {
    this.stop();
    this.elapsedTime = 0;
    this.currentLap = 0;
    this.accumulatedTime = 0;
    this.eventManager.clear();
    
    // Reset vehicles
    this.positionVehiclesAtStart();
    this.vehicles.forEach(vehicle => {
      vehicle.speed = 0;
      vehicle.acceleration = 0;
      vehicle.tireWear = 0;
      vehicle.energyModel.currentLevel = vehicle.energyModel.capacity;
      vehicle.isInPit = false;
      vehicle.pitStopTime = 0;
      vehicle.overtakes = 0;
      vehicle.positionsLost = 0;
      vehicle.hazardsTriggered = 0;
      vehicle.lapTimes = [];
      vehicle.currentTime = 0;
    });
    
    // Reset weather
    this.weather = { ...this.config.weatherProfile.initialWeather };
    
    // Emit initial state
    this.emitStateUpdate();
  }

  // Main game loop with fixed timestep
  private gameLoop(): void {
    if (!this.isRunning || this.isPaused) return;
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = currentTime;
    
    // Accumulate time for fixed timestep
    this.accumulatedTime += deltaTime * this.config.speedMultiplier;
    
    // Process fixed timesteps
    while (this.accumulatedTime >= this.config.fixedTimestep) {
      this.tick(this.config.fixedTimestep);
      this.accumulatedTime -= this.config.fixedTimestep;
    }
    
    // Continue game loop
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  // Single simulation tick
  private tick(deltaTime: number): void {
    // Skip if no vehicles
    if (this.vehicles.length === 0) return;
    
    // Update elapsed time
    this.elapsedTime += deltaTime;
    
    // Process events
    this.eventManager.process();
    
    // Update weather
    this.updateWeather(deltaTime);
    
    // Inject random events
    this.injectRandomEvents();
    
    // Update each vehicle
    this.vehicles.forEach(vehicle => {
      if (vehicle.isInPit) {
        this.updatePitStop(vehicle, deltaTime);
      } else {
        this.updateVehicle(vehicle, deltaTime);
      }
    });
    
    // Check for race completion
    this.checkRaceCompletion();
    
    // Emit state update
    this.emitStateUpdate();
  }

  // Update individual vehicle
  private async updateVehicle(vehicle: VehicleModel, deltaTime: number): Promise<void> {
    // Get current segment
    const segment = this.track[vehicle.currentSegment];
    if (!segment) return;
    
    // Calculate surroundings
    const surroundings = this.calculateSurroundings(vehicle);
    
    // Get obstacles from nearby segments
    const hazards: Array<{type: string, segmentId: number, distance: number}> = [];
    for (let i = 0; i < this.track.length; i++) {
      const segment = this.track[i];
      if ((segment as any).obstacle) {
        const distance = Math.abs(i - vehicle.currentSegment);
        if (distance <= 3) { // Only consider nearby obstacles
          hazards.push({
            type: (segment as any).obstacle,
            segmentId: i,
            distance
          });
        }
      }
    }
    
    // Get strategy decision from agent
    const strategyEngine = this.getStrategyEngine(vehicle);
    const context: StrategyContext = {
      vehicle,
      raceState: this.getRaceState(),
      surroundings,
      currentSegment: segment,
      weather: this.weather,
      battery: vehicle.energyModel.currentLevel,
      tireWear: vehicle.tireWear,
      hazards,
      currentLap: this.currentLap,
      totalLaps: this.config.totalLaps
    };
    
    const decision = await strategyEngine.makeDecision(context);
    
    // Log AI decision for debugging
    if (vehicle.agentId) {
      // Calculate target speed for logging (same logic as in StrategyEngine)
      let targetSpeed = vehicle.maxSpeed;
      
      // Adjust for segment type
      switch (segment.type) {
        case 'corner':
          if (segment.radius) {
            const maxLateralG = (segment.grip || 1.2) * 9.81 * (1 - vehicle.tireWear * 0.3);
            const cornerSpeed = Math.sqrt(maxLateralG * segment.radius) * 3.6;
            targetSpeed = Math.min(targetSpeed, cornerSpeed);
          }
          break;
        case 'hairpin':
          targetSpeed = Math.min(targetSpeed, 80);
          break;
        case 'chicane':
          targetSpeed = Math.min(targetSpeed, vehicle.maxSpeed * 0.7);
          break;
      }
      
      // Adjust for hazards
      for (const hazard of hazards) {
        if (hazard.type === 'debris') {
          targetSpeed *= 0.7;
        } else if (hazard.type === 'oil_spill') {
          targetSpeed *= 0.5;
        } else if (hazard.type === 'retired_car') {
          targetSpeed *= 0.6;
        }
      }
      
      console.log(`AI Agent ${vehicle.agentId} decision:`, {
        targetSpeed: targetSpeed.toFixed(2),
        throttle: decision.throttle.toFixed(3),
        braking: decision.braking.toFixed(3),
        steering: decision.steering.toFixed(3),
        riskLevel: decision.riskLevel.toFixed(3),
        drsActivation: decision.drsActivation,
        overtakingDecision: decision.overtakingDecision,
        pitDecision: decision.pitDecision,
        energyManagement: decision.energyManagement,
        hazardsDetected: hazards.length,
        currentSpeed: vehicle.speed.toFixed(2),
        currentSegment: vehicle.currentSegment,
        segmentType: segment.type
      });
    }
    
    // Apply strategy decisions first
    this.applyStrategyDecisions(vehicle, decision);
    
    // Apply physics with AI-modified parameters
    const physicsResult = PhysicsEngine.applyPhysics(vehicle, segment, this.weather, deltaTime);
    
    // Update vehicle state
    vehicle.speed = physicsResult.speed;
    // Keep AI's acceleration if it was set, otherwise use physics
    if (vehicle.acceleration === 0) {
      vehicle.acceleration = physicsResult.acceleration;
    }
    
    // Update position and segment progress
    this.updateVehiclePosition(vehicle, deltaTime);
    
    // Handle pit stops
    if (decision.pitDecision === 'immediate' && this.canEnterPit(vehicle)) {
      this.enterPit(vehicle);
    }
  }

  // Update vehicle position along track
  private updateVehiclePosition(vehicle: VehicleModel, deltaTime: number): void {
    const segment = this.track[vehicle.currentSegment];
    if (!segment) return;
    
    // Check for obstacle collision in current segment
    if ((segment as any).obstacle) {
      console.log(`💥 Vehicle ${vehicle.id} HIT ${(segment as any).obstacle} obstacle on segment ${vehicle.currentSegment}`);
      // Reduce speed significantly when hitting obstacle
      vehicle.speed *= 0.3;
      vehicle.tireWear += 0.05; // Increase tire wear
      // Mark obstacle as hit for visualization
      (vehicle as any).obstacleHit = true;
      // Clear obstacle after collision (simplified)
      delete (segment as any).obstacle;
    } else {
      // Clear obstacle hit flag if no obstacle
      (vehicle as any).obstacleHit = false;
    }
    
    // Calculate distance traveled
    const distanceTraveled = vehicle.speed * (deltaTime / 3.6); // Convert km/h to m/s
    const segmentProgressIncrease = distanceTraveled / segment.length;
    
    vehicle.segmentProgress += segmentProgressIncrease;
    
    // Check for segment transition
    if (vehicle.segmentProgress >= 1.0) {
      vehicle.segmentProgress -= 1.0;
      vehicle.currentSegment = (vehicle.currentSegment + 1) % this.track.length;
      
      // Check for lap completion
      if (vehicle.currentSegment === 0) {
        vehicle.laps++;
        if (vehicle.lapTimes.length > 0) {
          vehicle.lapTimes.push(this.elapsedTime - vehicle.currentTime);
          vehicle.currentTime = this.elapsedTime;
        }
      }
      
      // Update position to new segment start
      const nextSegment = this.track[vehicle.currentSegment];
      if (nextSegment.startX !== undefined && nextSegment.startY !== undefined) {
        vehicle.position = { x: nextSegment.startX, y: nextSegment.startY };
      }
    } else {
      // Interpolate position within current segment
      if (segment.startX !== undefined && segment.startY !== undefined &&
          segment.endX !== undefined && segment.endY !== undefined) {
        const t = vehicle.segmentProgress;
        vehicle.position = {
          x: segment.startX + (segment.endX - segment.startX) * t,
          y: segment.startY + (segment.endY - segment.startY) * t
        };
      }
    }
    
    // Update total distance
    vehicle.distance += distanceTraveled;
    
    // Calculate angle for rendering
    if (segment.endX !== undefined && segment.startX !== undefined &&
        segment.endY !== undefined && segment.startY !== undefined) {
      vehicle.angle = Math.atan2(
        segment.endY - segment.startY,
        segment.endX - segment.startX
      );
    }
  }

  // Calculate vehicle surroundings
  private calculateSurroundings(vehicle: VehicleModel): LocalSurroundings {
    const ahead: VehicleModel[] = [];
    const behind: VehicleModel[] = [];
    const nearby: VehicleModel[] = [];
    
    this.vehicles.forEach(other => {
      if (other.id === vehicle.id) return;
      
      const distance = this.calculateDistance(vehicle, other);
      
      if (distance < 20) { // Nearby threshold
        nearby.push(other);
      }
      
      // Determine if ahead or behind based on track position
      if (other.laps > vehicle.laps || 
          (other.laps === vehicle.laps && other.distance > vehicle.distance)) {
        ahead.push(other);
      } else {
        behind.push(other);
      }
    });
    
    // Sort by distance
    ahead.sort((a, b) => this.calculateDistance(vehicle, a) - this.calculateDistance(vehicle, b));
    behind.sort((a, b) => this.calculateDistance(vehicle, a) - this.calculateDistance(vehicle, b));
    
    return {
      ahead: ahead.slice(0, 3), // Top 3 ahead
      behind: behind.slice(0, 3), // Top 3 behind
      nearby: nearby.slice(0, 5), // Top 5 nearby
      distanceToNext: ahead.length > 0 ? this.calculateDistance(vehicle, ahead[0]) : Infinity,
      distanceToPrevious: behind.length > 0 ? this.calculateDistance(vehicle, behind[0]) : Infinity
    };
  }

  // Calculate distance between two vehicles
  private calculateDistance(v1: VehicleModel, v2: VehicleModel): number {
    // Simple Euclidean distance for now
    const dx = v1.position.x - v2.position.x;
    const dy = v1.position.y - v2.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Get race state for strategy engines
  private getRaceState(): RaceState {
    return {
      vehicles: [...this.vehicles],
      currentTrack: this.track,
      weather: this.weather,
      elapsedTime: this.elapsedTime,
      totalLaps: this.config.totalLaps,
      currentLap: this.currentLap
    };
  }

  // Get strategy engine for vehicle (placeholder for now)
  private getStrategyEngine(vehicle: VehicleModel): StrategyEngine {
    // Try to get the agent for this vehicle
    const agents = (this as any).agents;
    if (agents && Array.isArray(agents)) {
      const agent = agents.find(a => a.id === vehicle.agentId);
      if (agent && (agent as any).strategyEngine) {
        return (agent as any).strategyEngine;
      }
    }
    // Fallback to rule-based engine
    return new RuleBasedStrategyEngine();
  }

  // Apply strategy decisions to vehicle
  private applyStrategyDecisions(vehicle: VehicleModel, decision: StrategyDecision): void {
    // Apply throttle and braking decisions
    if (decision.throttle > 0) {
      // Increase acceleration based on throttle
      vehicle.acceleration = decision.throttle * 15; // Max acceleration 15 m/s²
    }
    
    if (decision.braking > 0) {
      // Apply braking force
      vehicle.speed *= (1 - decision.braking * 0.1); // Reduce speed by up to 10%
    }
    
    // Apply steering decisions (affects cornering speed)
    if (decision.steering !== 0) {
      // Steering affects max cornering speed
      const steeringEffect = Math.abs(decision.steering) * 0.2; // Up to 20% speed reduction
      vehicle.speed *= (1 - steeringEffect);
    }
    
    // Handle DRS activation
    if (decision.drsActivation) {
      // Apply DRS boost (temporary speed increase)
      vehicle.speed *= 1.1; // 10% speed boost
    }
    
    // Handle overtaking attempts
    if (decision.overtakingDecision === 'attempt') {
      // Boost speed for overtaking
      vehicle.speed *= 1.05; // 5% speed boost
      this.eventManager.emitOvertakeAttempt(vehicle.id, this.getVehicleAhead(vehicle)?.id || 0);
    }
  }

  // Get vehicle ahead
  private getVehicleAhead(vehicle: VehicleModel): VehicleModel | undefined {
    return this.vehicles.find(v => 
      v.id !== vehicle.id && 
      (v.laps > vehicle.laps || (v.laps === vehicle.laps && v.distance > vehicle.distance))
    );
  }

  // Update pit stop
  private updatePitStop(vehicle: VehicleModel, deltaTime: number): void {
    vehicle.pitStopTime -= deltaTime;
    
    if (vehicle.pitStopTime <= 0) {
      vehicle.isInPit = false;
      vehicle.tireWear = 0;
      vehicle.energyModel.currentLevel = vehicle.energyModel.capacity;
      vehicle.pitStopTime = 0;
    }
  }

  // Enter pit stop
  private enterPit(vehicle: VehicleModel): void {
    vehicle.isInPit = true;
    vehicle.pitStopTime = 3.0; // 3 second pit stop
    this.eventManager.emitPitStop(vehicle.id, 'scheduled');
  }

  // Check if vehicle can enter pit
  private canEnterPit(vehicle: VehicleModel): boolean {
    // Check if vehicle is near pit entry
    // This would need pit lane information from track
    return !vehicle.isInPit && vehicle.currentSegment === 0; // Simplified
  }

  // Position vehicles at start
  private positionVehiclesAtStart(): void {
    const startSegment = this.track[0];
    if (!startSegment) return;
    
    this.vehicles.forEach((vehicle, index) => {
      vehicle.position = { 
        x: startSegment.startX || 0, 
        y: startSegment.startY || 0 
      };
      vehicle.currentSegment = 0;
      vehicle.segmentProgress = index * 0.05; // Stagger start positions
      vehicle.angle = 0;
      vehicle.distance = 0;
      vehicle.laps = 0;
    });
  }

  // Update weather
  private updateWeather(deltaTime: number): void {
    // Random weather changes
    if (Math.random() < this.config.weatherProfile.changeProbability * deltaTime / 60) {
      const weatherTypes: Weather['type'][] = ['clear', 'rain', 'wind'];
      const newWeatherType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
      const newIntensity = Math.random();
      
      this.weather = {
        type: newWeatherType,
        intensity: newIntensity,
        windDirection: newWeatherType === 'wind' ? Math.random() * Math.PI * 2 : undefined,
        temperature: 20 + Math.random() * 15 // 20-35°C
      };
      
      this.eventManager.emitWeatherChange(this.weather);
    }
  }

  // Inject random events
  private injectRandomEvents(): void {
    // Battery low events
    this.vehicles.forEach(vehicle => {
      if (vehicle.energyModel.currentLevel < 0.2 && 
          Math.random() < this.config.eventProbabilities.batteryLow * this.config.fixedTimestep / 60) {
        this.eventManager.emitBatteryLow(vehicle.id, vehicle.energyModel.currentLevel);
      }
      
      // Breakdown events
      if (Math.random() < this.config.eventProbabilities.breakdown * this.config.fixedTimestep / 60) {
        const severity = Math.random();
        this.eventManager.emitBreakdown(vehicle.id, severity);
      }
    });
    
    // Obstacle appear events
    if (Math.random() < this.config.eventProbabilities.obstacleAppear * this.config.fixedTimestep / 60) {
      const segmentId = Math.floor(Math.random() * this.track.length);
      const obstacleTypes = ['debris', 'oil_spill', 'retired_car'];
      const obstacleType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
      console.log(`🚧 OBSTACLE GENERATED: ${obstacleType} on segment ${segmentId}`);
      this.eventManager.emitObstacleAppear(segmentId, obstacleType);
    }
    
    // Collision events
    for (let i = 0; i < this.vehicles.length; i++) {
      for (let j = i + 1; j < this.vehicles.length; j++) {
        const distance = this.calculateDistance(this.vehicles[i], this.vehicles[j]);
        if (distance < 5 && Math.random() < this.config.eventProbabilities.collision * this.config.fixedTimestep / 60) {
          const severity = Math.random();
          this.eventManager.emitCollision(this.vehicles[i].id, this.vehicles[j].id, severity);
        }
      }
    }
  }

  // Check for race completion
  private checkRaceCompletion(): void {
    if (this.vehicles.length === 0) return;
    
    const leadingVehicle = this.vehicles.reduce((prev, current) => 
      current.laps > prev.laps || (current.laps === prev.laps && current.distance > prev.distance) 
        ? current : prev
    );
    
    if (leadingVehicle.laps >= this.config.totalLaps) {
      this.stop();
      this.emitStateUpdate(); // Final state update
    }
  }

  // Setup event subscriptions
  private setupEventSubscriptions(): void {
    // Subscribe to relevant events and handle them
    this.eventManager.subscribe(EventType.BREAKDOWN, (event) => {
      const vehicle = this.vehicles.find(v => v.id === event.targetVehicleId);
      if (vehicle) {
        vehicle.speed *= (1 - event.data.severity * 0.5); // Reduce speed
      }
    });
    
    this.eventManager.subscribe(EventType.COLLISION, (event) => {
      const vehicle = this.vehicles.find(v => v.id === event.targetVehicleId);
      if (vehicle) {
        vehicle.speed *= (1 - event.data.severity * 0.3); // Reduce speed
        vehicle.tireWear += event.data.severity * 0.1; // Increase tire wear
      }
    });
    
    this.eventManager.subscribe(EventType.OBSTACLE_APPEAR, (event) => {
      // Store obstacles in track segments for collision detection
      const segment = this.track[event.data.segmentId];
      if (segment) {
        // Add obstacle to segment (simplified - in real implementation would need proper obstacle tracking)
        (segment as any).obstacle = event.data.obstacleType;
      }
    });
    
    this.eventManager.subscribe(EventType.BATTERY_LOW, (event) => {
      const vehicle = this.vehicles.find(v => v.id === event.targetVehicleId);
      if (vehicle) {
        // Note: Battery low events are handled in strategy engine by reducing throttle
        // maxSpeed is read-only, so we handle this through strategy decisions
      }
    });
  }

  // Emit state update to UI
  private emitStateUpdate(): void {
    if (!this.stateUpdateCallback) return;
    
    const snapshot: SimulationSnapshot = {
      timestamp: Date.now(),
      elapsedTime: this.elapsedTime,
      raceState: this.isRunning ? (this.isPaused ? 'paused' : 'running') : 'stopped',
      vehicles: this.vehicles.map(vehicle => vehicle.getSnapshot()),
      weather: this.weather,
      currentLap: this.currentLap,
      totalLaps: this.config.totalLaps,
      events: this.eventManager.getEventsForVehicle(0) // Get all events
    };
    
    this.stateUpdateCallback(snapshot);
  }

  // Set speed multiplier
  public setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, Math.min(10, multiplier));
  }

  // Get current simulation state
  public getState(): SimulationSnapshot {
    return {
      timestamp: Date.now(),
      elapsedTime: this.elapsedTime,
      raceState: this.isRunning ? (this.isPaused ? 'paused' : 'running') : 'stopped',
      vehicles: this.vehicles.map(vehicle => vehicle.getSnapshot()),
      weather: this.weather,
      currentLap: this.currentLap,
      totalLaps: this.config.totalLaps,
      events: []
    };
  }
}
