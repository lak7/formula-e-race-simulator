import { BaseAgent, AgentConfig } from './BaseAgent';
import { StrategyEngine, StrategyDecision, StrategyContext, LLMStrategyEngine } from '../engine/StrategyEngine';

export interface LLMAgentConfig extends AgentConfig {
  apiEndpoint: string;
  modelType: string;
  updateTriggers: {
    weatherChange: boolean;
    pitDecision: boolean;
    overtakingOpportunity: boolean;
    batteryLow: boolean;
    timeInterval: number; // Update every N seconds
  };
  fallbackStrategy: StrategyEngine;
}

export class LLMAgent extends BaseAgent {
  private apiEndpoint: string;
  private modelType: string;
  private updateTriggers: LLMAgentConfig['updateTriggers'];
  private fallbackStrategy: StrategyEngine;
  private lastUpdateTime: number = 0;
  private lastWeatherType?: string;
  private lastBatteryLevel: number = 1.0;
  private strategyCache: StrategyDecision | null = null;
  private cacheValidUntil: number = 0;

  constructor(config: LLMAgentConfig) {
    super(config);
    this.apiEndpoint = config.apiEndpoint;
    this.modelType = config.modelType;
    this.updateTriggers = config.updateTriggers;
    this.fallbackStrategy = config.fallbackStrategy;
  }

  public async initialize(): Promise<void> {
    try {
      // Test API connectivity
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });

      if (!response.ok) {
        throw new Error(`API initialization failed: ${response.status}`);
      }

      console.log(`LLM Agent ${this.name} initialized successfully with model ${this.modelType}`);
    } catch (error) {
      console.error(`LLM Agent ${this.name} initialization failed:`, error);
      console.log(`Falling back to rule-based strategy for ${this.name}`);
      
      // Switch to fallback strategy
      this.strategyEngine = this.fallbackStrategy;
    }
  }

  public async cleanup(): Promise<void> {
    this.strategyCache = null;
    this.cacheValidUntil = 0;
    console.log(`LLM Agent ${this.name} cleaned up`);
  }

  public getStatus(): string {
    const isLLMActive = this.strategyEngine instanceof LLMStrategyEngine;
    const cacheStatus = this.strategyCache && Date.now() < this.cacheValidUntil ? 'cached' : 'fresh';
    
    return `LLM Agent (${this.modelType}) - ${isLLMActive ? 'LLM' : 'Fallback'} - Cache: ${cacheStatus}`;
  }

  public async makeDecision(context: StrategyContext): Promise<StrategyDecision> {
    if (!this.isAgentActive()) {
      return this.getDefaultDecision();
    }

    // Check if we need to update strategy
    if (this.shouldUpdateStrategy(context)) {
      await this.updateStrategy(context);
    }

    // Use cached strategy if valid, otherwise get fresh decision
    if (this.strategyCache && Date.now() < this.cacheValidUntil) {
      return this.strategyCache;
    }

    try {
      const decision = await this.strategyEngine.makeDecision(context);
      this.cacheStrategy(decision);
      return decision;
    } catch (error) {
      console.error(`LLM Agent ${this.name} decision error:`, error);
      
      // Fall back to cached strategy if available
      if (this.strategyCache) {
        console.log(`LLM Agent ${this.name} using cached strategy due to error`);
        return this.strategyCache;
      }
      
      // Fall back to fallback strategy
      return this.fallbackStrategy.makeDecision(context);
    }
  }

  private shouldUpdateStrategy(context: StrategyContext): boolean {
    const now = Date.now();
    
    // Time-based update
    if (now - this.lastUpdateTime > this.updateTriggers.timeInterval * 1000) {
      return true;
    }
    
    // Weather change trigger
    if (this.updateTriggers.weatherChange && 
        context.weather.type !== this.lastWeatherType) {
      return true;
    }
    
    // Battery low trigger
    if (this.updateTriggers.batteryLow && 
        context.battery < 0.2 && 
        Math.abs(context.battery - this.lastBatteryLevel) > 0.05) {
      return true;
    }
    
    // Overtaking opportunity trigger
    if (this.updateTriggers.overtakingOpportunity && 
        context.surroundings.ahead.length > 0 && 
        context.surroundings.distanceToNext < 20) {
      return true;
    }
    
    // Pit decision trigger
    if (this.updateTriggers.pitDecision && 
        (context.vehicle.tireWear > 0.8 || context.battery < 0.15)) {
      return true;
    }
    
    return false;
  }

  private async updateStrategy(context: StrategyContext): Promise<void> {
    try {
      // Prepare enhanced context for LLM
      const enhancedContext = this.prepareEnhancedContext(context);
      
      // Get fresh decision from LLM
      const decision = await this.strategyEngine.makeDecision(enhancedContext);
      
      // Cache the decision
      this.cacheStrategy(decision);
      
      // Update tracking variables
      this.lastUpdateTime = Date.now();
      this.lastWeatherType = context.weather.type;
      this.lastBatteryLevel = context.battery;
      
      console.log(`LLM Agent ${this.name} updated strategy via trigger`);
    } catch (error) {
      console.error(`LLM Agent ${this.name} strategy update failed:`, error);
    }
  }

  private prepareEnhancedContext(context: StrategyContext): StrategyContext {
    // Add historical context and analysis for LLM
    const recentDecisions = this.getDecisionHistory().slice(-5); // Last 5 decisions
    
    return {
      ...context,
      // Enhanced context for LLM
      agentHistory: {
        recentDecisions,
        performanceMetrics: this.getPerformanceMetrics(),
        currentStrategy: this.strategyCache
      }
    } as StrategyContext;
  }

  private cacheStrategy(decision: StrategyDecision): void {
    this.strategyCache = decision;
    // Cache strategy for 1 second (high frequency updates)
    this.cacheValidUntil = Date.now() + 1000;
  }

  // Force strategy update (useful for manual updates)
  public async forceStrategyUpdate(context: StrategyContext): Promise<StrategyDecision> {
    this.lastUpdateTime = 0; // Reset to force update
    return this.makeDecision(context);
  }

  // Get current strategy cache status
  public getCacheStatus(): {
    isCached: boolean;
    cacheAge: number;
    cacheValidUntil: number;
  } {
    const now = Date.now();
    return {
      isCached: this.strategyCache !== null && now < this.cacheValidUntil,
      cacheAge: this.strategyCache ? now - (this.cacheValidUntil - 1000) : 0,
      cacheValidUntil: this.cacheValidUntil
    };
  }

  // Switch to fallback strategy manually
  public switchToFallback(): void {
    console.log(`LLM Agent ${this.name} switching to fallback strategy`);
    this.strategyEngine = this.fallbackStrategy;
    this.strategyCache = null;
    this.cacheValidUntil = 0;
  }

  // Switch back to LLM strategy
  public switchToLLM(): void {
    console.log(`LLM Agent ${this.name} switching back to LLM strategy`);
    this.strategyEngine = new LLMStrategyEngine(this.apiEndpoint, this.modelType);
    this.strategyCache = null;
    this.cacheValidUntil = 0;
  }

  // Get agent type
  public getAgentType(): string {
    return 'llm';
  }

  // Get model information
  public getModelInfo(): {
    modelType: string;
    apiEndpoint: string;
    isActive: boolean;
    isUsingFallback: boolean;
  } {
    const isUsingFallback = !(this.strategyEngine instanceof LLMStrategyEngine);
    
    return {
      modelType: this.modelType,
      apiEndpoint: this.apiEndpoint,
      isActive: this.isAgentActive(),
      isUsingFallback
    };
  }
}
