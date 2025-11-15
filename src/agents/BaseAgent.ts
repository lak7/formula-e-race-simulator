import { VehicleModel, VehicleBehaviorType, EnergyModel, PerformanceProfile } from '../engine/VehicleModel';
import { StrategyEngine, StrategyDecision, StrategyContext } from '../engine/StrategyEngine';

export interface AgentConfig {
  id: number;
  name: string;
  behaviorType: VehicleBehaviorType;
  vehicleConfig: {
    mass: number;
    maxSpeed: number;
    accelerationProfile: PerformanceProfile;
    brakingProfile: PerformanceProfile;
    turningRadius: number;
    dragCoefficient: number;
    gripCoefficient: number;
    energyModel: EnergyModel;
  };
  strategyEngine: StrategyEngine;
}

export abstract class BaseAgent {
  public readonly id: number;
  public readonly name: string;
  public readonly behaviorType: VehicleBehaviorType;
  protected vehicle: VehicleModel;
  protected strategyEngine: StrategyEngine;
  protected isActive: boolean = true;
  protected decisionHistory: StrategyDecision[] = [];
  protected maxHistorySize: number = 100;

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.behaviorType = config.behaviorType;
    this.vehicle = new VehicleModel({
      id: config.id,
      name: config.name,
      behaviorType: config.behaviorType,
      agentId: config.id,
      ...config.vehicleConfig
    });
    this.strategyEngine = config.strategyEngine;
  }

  // Get the vehicle model for this agent
  public getVehicle(): VehicleModel {
    return this.vehicle;
  }

  // Get strategy engine for this agent
  public getStrategyEngine(): StrategyEngine {
    return this.strategyEngine;
  }

  // Make a decision based on current context
  public async makeDecision(context: StrategyContext): Promise<StrategyDecision> {
    if (!this.isActive) {
      // Return safe default decision if agent is inactive
      return this.getDefaultDecision();
    }

    try {
      const decision = await this.strategyEngine.makeDecision(context);
      
      // Store decision in history
      this.addToHistory(decision);
      
      // Validate decision
      return this.validateDecision(decision);
    } catch (error) {
      console.error(`Agent ${this.name} decision error:`, error);
      return this.getDefaultDecision();
    }
  }

  // Activate/deactivate agent
  public setActive(active: boolean): void {
    this.isActive = active;
  }

  // Check if agent is active
  public isAgentActive(): boolean {
    return this.isActive;
  }

  // Get decision history
  public getDecisionHistory(): StrategyDecision[] {
    return [...this.decisionHistory];
  }

  // Clear decision history
  public clearHistory(): void {
    this.decisionHistory = [];
  }

  // Get agent performance metrics
  public getPerformanceMetrics(): {
    totalDecisions: number;
    averageRiskLevel: number;
    overtakingAttempts: number;
    pitStopDecisions: number;
    drsActivations: number;
  } {
    const totalDecisions = this.decisionHistory.length;
    if (totalDecisions === 0) {
      return {
        totalDecisions: 0,
        averageRiskLevel: 0,
        overtakingAttempts: 0,
        pitStopDecisions: 0,
        drsActivations: 0
      };
    }

    const averageRiskLevel = this.decisionHistory.reduce((sum, decision) => sum + decision.riskLevel, 0) / totalDecisions;
    const overtakingAttempts = this.decisionHistory.filter(decision => decision.overtakingDecision === 'attempt').length;
    const pitStopDecisions = this.decisionHistory.filter(decision => decision.pitDecision !== 'none').length;
    const drsActivations = this.decisionHistory.filter(decision => decision.drsActivation).length;

    return {
      totalDecisions,
      averageRiskLevel,
      overtakingAttempts,
      pitStopDecisions,
      drsActivations
    };
  }

  // Reset agent state
  public reset(): void {
    this.clearHistory();
    this.isActive = true;
    
    // Reset vehicle state
    this.vehicle.speed = 0;
    this.vehicle.acceleration = 0;
    this.vehicle.tireWear = 0;
    this.vehicle.energyModel.currentLevel = this.vehicle.energyModel.capacity;
    this.vehicle.isInPit = false;
    this.vehicle.pitStopTime = 0;
    this.vehicle.overtakes = 0;
    this.vehicle.positionsLost = 0;
    this.vehicle.hazardsTriggered = 0;
    this.vehicle.lapTimes = [];
    this.vehicle.currentTime = 0;
  }

  // Add decision to history
  private addToHistory(decision: StrategyDecision): void {
    this.decisionHistory.push(decision);
    
    // Limit history size
    if (this.decisionHistory.length > this.maxHistorySize) {
      this.decisionHistory.shift();
    }
  }

  // Validate and sanitize decision
  private validateDecision(decision: StrategyDecision): StrategyDecision {
    return {
      throttle: Math.max(0, Math.min(1, decision.throttle)),
      braking: Math.max(0, Math.min(1, decision.braking)),
      steering: Math.max(-1, Math.min(1, decision.steering)),
      riskLevel: Math.max(0, Math.min(1, decision.riskLevel)),
      overtakingDecision: ['none', 'attempt', 'defend'].includes(decision.overtakingDecision) 
        ? decision.overtakingDecision 
        : 'none',
      pitDecision: ['none', 'immediate', 'next_lap'].includes(decision.pitDecision)
        ? decision.pitDecision
        : 'none',
      drsActivation: Boolean(decision.drsActivation),
      energyManagement: ['aggressive', 'balanced', 'conservative'].includes(decision.energyManagement)
        ? decision.energyManagement
        : 'balanced'
    };
  }

  // Get safe default decision
  protected getDefaultDecision(): StrategyDecision {
    return {
      throttle: 0.5,
      braking: 0,
      steering: 0,
      riskLevel: 0.3,
      overtakingDecision: 'none',
      pitDecision: 'none',
      drsActivation: false,
      energyManagement: 'balanced'
    };
  }

  // Abstract method for agent-specific initialization
  public abstract initialize(): Promise<void>;

  // Abstract method for agent-specific cleanup
  public abstract cleanup(): Promise<void>;

  // Abstract method for agent-specific status updates
  public abstract getStatus(): string;
}
