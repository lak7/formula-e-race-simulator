import { BaseAgent, AgentConfig } from './BaseAgent';
import { StrategyEngine, StrategyDecision, StrategyContext, RuleBasedStrategyEngine } from '../engine/StrategyEngine';

export interface RuleBasedAgentConfig extends AgentConfig {
  aggressiveness: 'conservative' | 'balanced' | 'aggressive';
  tireManagement: 'poor' | 'average' | 'excellent';
  fuelStrategy: 'short' | 'medium' | 'long';
  overtakingSkill: 'cautious' | 'normal' | 'bold';
  defensiveSkill: 'weak' | 'average' | 'strong';
}

export class RuleBasedAgent extends BaseAgent {
  private aggressiveness: RuleBasedAgentConfig['aggressiveness'];
  private tireManagement: RuleBasedAgentConfig['tireManagement'];
  private fuelStrategy: RuleBasedAgentConfig['fuelStrategy'];
  private overtakingSkill: RuleBasedAgentConfig['overtakingSkill'];
  private defensiveSkill: RuleBasedAgentConfig['defensiveSkill'];

  // Performance modifiers based on agent traits
  private performanceModifiers: {
    speedMultiplier: number;
    tireWearMultiplier: number;
    fuelConsumptionMultiplier: number;
    overtakingSuccessRate: number;
    defensiveSuccessRate: number;
  } = {
    speedMultiplier: 1.0,
    tireWearMultiplier: 1.0,
    fuelConsumptionMultiplier: 1.0,
    overtakingSuccessRate: 0.5,
    defensiveSuccessRate: 0.5
  };

  constructor(config: RuleBasedAgentConfig) {
    super(config);
    this.aggressiveness = config.aggressiveness;
    this.tireManagement = config.tireManagement;
    this.fuelStrategy = config.fuelStrategy;
    this.overtakingSkill = config.overtakingSkill;
    this.defensiveSkill = config.defensiveSkill;
    
    this.calculatePerformanceModifiers();
  }

  public async initialize(): Promise<void> {
    console.log(`Rule-based Agent ${this.name} initialized with traits:`, {
      aggressiveness: this.aggressiveness,
      tireManagement: this.tireManagement,
      fuelStrategy: this.fuelStrategy,
      overtakingSkill: this.overtakingSkill,
      defensiveSkill: this.defensiveSkill
    });
  }

  public async cleanup(): Promise<void> {
    console.log(`Rule-based Agent ${this.name} cleaned up`);
  }

  public getStatus(): string {
    return `Rule-based Agent - ${this.aggressiveness} / ${this.tireManagement} / ${this.fuelStrategy}`;
  }

  public async makeDecision(context: StrategyContext): Promise<StrategyDecision> {
    if (!this.isAgentActive()) {
      return this.getDefaultDecision();
    }

    try {
      // Get base decision from rule-based strategy engine
      const baseDecision = await this.strategyEngine.makeDecision(context);
      
      // Apply agent-specific modifications
      return this.applyAgentTraits(baseDecision, context);
    } catch (error) {
      console.error(`Rule-based Agent ${this.name} decision error:`, error);
      return this.getDefaultDecision();
    }
  }

  private calculatePerformanceModifiers(): void {
    // Speed modifiers based on aggressiveness
    let speedMultiplier = 1.0;
    switch (this.aggressiveness) {
      case 'aggressive':
        speedMultiplier = 1.05;
        break;
      case 'balanced':
        speedMultiplier = 1.0;
        break;
      case 'conservative':
        speedMultiplier = 0.95;
        break;
    }

    // Tire wear modifiers based on tire management skill
    let tireWearMultiplier = 1.0;
    switch (this.tireManagement) {
      case 'excellent':
        tireWearMultiplier = 0.8;
        break;
      case 'average':
        tireWearMultiplier = 1.0;
        break;
      case 'poor':
        tireWearMultiplier = 1.2;
        break;
    }

    // Fuel consumption modifiers based on fuel strategy
    let fuelConsumptionMultiplier = 1.0;
    switch (this.fuelStrategy) {
      case 'long':
        fuelConsumptionMultiplier = 0.85;
        break;
      case 'medium':
        fuelConsumptionMultiplier = 1.0;
        break;
      case 'short':
        fuelConsumptionMultiplier = 1.15;
        break;
    }

    // Overtaking success rate based on skill
    let overtakingSuccessRate = 0.5;
    switch (this.overtakingSkill) {
      case 'bold':
        overtakingSuccessRate = 0.7;
        break;
      case 'normal':
        overtakingSuccessRate = 0.5;
        break;
      case 'cautious':
        overtakingSuccessRate = 0.3;
        break;
    }

    // Defensive success rate based on skill
    let defensiveSuccessRate = 0.5;
    switch (this.defensiveSkill) {
      case 'strong':
        defensiveSuccessRate = 0.7;
        break;
      case 'average':
        defensiveSuccessRate = 0.5;
        break;
      case 'weak':
        defensiveSuccessRate = 0.3;
        break;
    }

    this.performanceModifiers = {
      speedMultiplier,
      tireWearMultiplier,
      fuelConsumptionMultiplier,
      overtakingSuccessRate,
      defensiveSuccessRate
    };
  }

  private applyAgentTraits(baseDecision: StrategyDecision, context: StrategyContext): StrategyDecision {
    let modifiedDecision = { ...baseDecision };

    // Apply aggressiveness to throttle and risk
    switch (this.aggressiveness) {
      case 'aggressive':
        modifiedDecision.throttle = Math.min(1.0, baseDecision.throttle * 1.1);
        modifiedDecision.riskLevel = Math.min(1.0, baseDecision.riskLevel * 1.2);
        break;
      case 'conservative':
        modifiedDecision.throttle *= 0.9;
        modifiedDecision.riskLevel *= 0.8;
        break;
      case 'balanced':
        // No modification
        break;
    }

    // Apply tire management to pit decisions
    if (this.tireManagement === 'excellent' && context.vehicle.tireWear > 0.7) {
      // Excellent managers pit earlier
      if (modifiedDecision.pitDecision === 'none') {
        modifiedDecision.pitDecision = 'next_lap';
      }
    } else if (this.tireManagement === 'poor' && context.vehicle.tireWear < 0.9) {
      // Poor managers pit later
      if (modifiedDecision.pitDecision === 'immediate') {
        modifiedDecision.pitDecision = 'next_lap';
      }
    }

    // Apply fuel strategy to energy management
    switch (this.fuelStrategy) {
      case 'long':
        modifiedDecision.energyManagement = 'conservative';
        modifiedDecision.throttle *= 0.9;
        break;
      case 'short':
        modifiedDecision.energyManagement = 'aggressive';
        modifiedDecision.throttle = Math.min(1.0, modifiedDecision.throttle * 1.05);
        break;
      case 'medium':
        // Keep base decision
        break;
    }

    // Apply overtaking skill to overtaking decisions
    if (baseDecision.overtakingDecision === 'attempt') {
      const successRoll = Math.random();
      if (successRoll > this.performanceModifiers.overtakingSuccessRate) {
        // Overtake fails, become defensive
        modifiedDecision.overtakingDecision = 'defend';
        modifiedDecision.riskLevel *= 0.7;
      }
    }

    // Apply defensive skill when being overtaken
    if (baseDecision.overtakingDecision === 'defend') {
      const defenseRoll = Math.random();
      if (defenseRoll > this.performanceModifiers.defensiveSuccessRate) {
        // Defense fails, become more cautious
        modifiedDecision.overtakingDecision = 'none';
        modifiedDecision.braking = Math.min(1.0, modifiedDecision.braking * 1.2);
      }
    }

    // Apply performance modifiers to vehicle (these would be applied in the simulation engine)
    this.applyPerformanceModifiers(context);

    return modifiedDecision;
  }

  private applyPerformanceModifiers(context: StrategyContext): void {
    // These modifications would be applied to the vehicle in the simulation engine
    // For now, we'll just log them for debugging
    
    if (context.vehicle.tireWear > 0.5) {
      // Apply tire wear multiplier
      const additionalWear = (this.performanceModifiers.tireWearMultiplier - 1.0) * 0.001;
      // This would be applied to vehicle.tireWear in the simulation
    }

    if (context.battery < 0.5) {
      // Apply fuel consumption multiplier
      const additionalConsumption = (this.performanceModifiers.fuelConsumptionMultiplier - 1.0) * 0.001;
      // This would be applied to vehicle.energyModel.currentLevel in the simulation
    }
  }

  // Get agent-specific performance modifiers
  public getPerformanceModifiers(): RuleBasedAgent['performanceModifiers'] {
    return { ...this.performanceModifiers };
  }

  // Get agent traits
  public getAgentTraits(): RuleBasedAgentConfig {
    return {
      id: this.id,
      name: this.name,
      behaviorType: this.behaviorType,
      vehicleConfig: {} as any, // Simplified for status
      strategyEngine: this.strategyEngine,
      aggressiveness: this.aggressiveness,
      tireManagement: this.tireManagement,
      fuelStrategy: this.fuelStrategy,
      overtakingSkill: this.overtakingSkill,
      defensiveSkill: this.defensiveSkill
    };
  }

  // Get agent type
  public getAgentType(): string {
    return 'rule-based';
  }

  // Create preset agent configurations
  public static createPreset(preset: 'beginner' | 'intermediate' | 'expert' | 'aggressive' | 'defensive', config: Omit<RuleBasedAgentConfig, 'aggressiveness' | 'tireManagement' | 'fuelStrategy' | 'overtakingSkill' | 'defensiveSkill'>): RuleBasedAgentConfig {
    switch (preset) {
      case 'beginner':
        return {
          ...config,
          aggressiveness: 'conservative',
          tireManagement: 'poor',
          fuelStrategy: 'short',
          overtakingSkill: 'cautious',
          defensiveSkill: 'weak'
        };
      
      case 'intermediate':
        return {
          ...config,
          aggressiveness: 'balanced',
          tireManagement: 'average',
          fuelStrategy: 'medium',
          overtakingSkill: 'normal',
          defensiveSkill: 'average'
        };
      
      case 'expert':
        return {
          ...config,
          aggressiveness: 'balanced',
          tireManagement: 'excellent',
          fuelStrategy: 'long',
          overtakingSkill: 'normal',
          defensiveSkill: 'strong'
        };
      
      case 'aggressive':
        return {
          ...config,
          aggressiveness: 'aggressive',
          tireManagement: 'average',
          fuelStrategy: 'short',
          overtakingSkill: 'bold',
          defensiveSkill: 'average'
        };
      
      case 'defensive':
        return {
          ...config,
          aggressiveness: 'conservative',
          tireManagement: 'excellent',
          fuelStrategy: 'long',
          overtakingSkill: 'cautious',
          defensiveSkill: 'strong'
        };
      
      default:
        return {
          ...config,
          aggressiveness: 'balanced',
          tireManagement: 'average',
          fuelStrategy: 'medium',
          overtakingSkill: 'normal',
          defensiveSkill: 'average'
        };
    }
  }
}
