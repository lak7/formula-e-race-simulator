import { 
  LLMDriverInput, 
  LLMDriverDecision, 
  CarState, 
  TrackSegment, 
  Weather,
  RivalInfo 
} from '@/types/racing';

export interface LLMDriver {
  name: string;
  llm_type: 'chatgpt' | 'claude' | 'gemini' | 'qwen';
  makeDecision(input: LLMDriverInput): Promise<LLMDriverDecision>;
}

// Mock LLM implementations for demonstration
export class ChatGPTDriver implements LLMDriver {
  name = 'ChatGPT';
  llm_type: 'chatgpt' = 'chatgpt';

  async makeDecision(input: LLMDriverInput): Promise<LLMDriverDecision> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    const { car_state, track_segment, rivals, weather, race_context } = input;
    
    // ChatGPT-style decision logic (aggressive but calculated)
    const decision: LLMDriverDecision = {
      braking_style: this.calculateBrakingStyle(car_state, track_segment, rivals),
      attack_mode: this.calculateAttackMode(race_context, car_state),
      overtake: this.shouldAttemptOvertake(rivals, track_segment, car_state),
      defend: this.shouldDefend(rivals, car_state),
      ers_strategy: this.calculateERS(car_state, track_segment, rivals),
      pit_decision: this.calculatePitDecision(car_state, race_context),
      risk_factor: this.calculateRiskFactor(car_state, race_context, weather),
      commentary: this.generateCommentary(input, 'ChatGPT')
    };

    return decision;
  }

  private calculateBrakingStyle(car_state: any, segment: any, rivals: any): 'early' | 'normal' | 'late' {
    if (segment.type === 'slow_corner' || segment.type === 'hairpin') return 'early';
    if (rivals.some((r: any) => r.distance_ahead_m && r.distance_ahead_m < 50)) return 'late';
    return 'normal';
  }

  private calculateAttackMode(race_context: any, car_state: any): 'conservative' | 'balanced' | 'aggressive' {
    if (race_context.cars_ahead > 3 && car_state.tyre_wear < 0.3) return 'aggressive';
    if (car_state.tyre_wear > 0.7) return 'conservative';
    return 'balanced';
  }

  private shouldAttemptOvertake(rivals: RivalInfo[], segment: TrackSegment, car_state: any): boolean {
    if (!segment.overtaking_zone) return false;
    const closeRival = rivals.find(r => r.distance_ahead_m && r.distance_ahead_m < 30);
    return closeRival !== undefined && car_state.tyre_wear < 0.6;
  }

  private shouldDefend(rivals: RivalInfo[], car_state: any): boolean {
    const closeBehind = rivals.find(r => r.distance_behind_m && r.distance_behind_m < 20);
    return closeBehind !== undefined && car_state.tyre_wear < 0.7;
  }

  private calculateERS(car_state: any, segment: TrackSegment, rivals: any): 'deploy' | 'harvest' | 'store' {
    if (segment.drs && car_state.ers > 0.3) return 'deploy';
    if (segment.type === 'straight' && rivals.some((r: any) => r.distance_ahead_m < 50)) return 'deploy';
    if (car_state.ers < 0.8) return 'harvest';
    return 'store';
  }

  private calculatePitDecision(car_state: any, race_context: any): 'none' | 'tyre' | 'fuel' | 'repair' {
    if (car_state.damage > 0.5) return 'repair';
    if (car_state.tyre_wear > 0.8 && race_context.laps_remaining > 5) return 'tyre';
    if (car_state.fuel < 10 && race_context.laps_remaining > 3) return 'fuel';
    return 'none';
  }

  private calculateRiskFactor(car_state: any, race_context: any, weather: any): number {
    let risk = 0.5;
    if (weather.type === 'dry') risk += 0.2;
    if (race_context.cars_ahead > 2) risk += 0.1;
    if (car_state.tyre_wear < 0.3) risk -= 0.2;
    return Math.max(0, Math.min(1, risk));
  }

  private generateCommentary(input: LLMDriverInput, driverName: string): string {
    const scenarios = [
      'Pushing hard for optimal lap time',
      'Managing tyres for long run',
      'Looking for overtake opportunity',
      'Defending position carefully',
      'Saving fuel for end of race'
    ];
    return `${driverName}: ${scenarios[Math.floor(Math.random() * scenarios.length)]}`;
  }
}

export class ClaudeDriver implements LLMDriver {
  name = 'Claude';
  llm_type: 'claude' = 'claude';

  async makeDecision(input: LLMDriverInput): Promise<LLMDriverDecision> {
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 150));

    const { car_state, track_segment, rivals, weather, race_context } = input;
    
    // Claude-style decision logic (balanced and strategic)
    const decision: LLMDriverDecision = {
      braking_style: this.calculateBrakingStyle(car_state, track_segment, weather),
      attack_mode: this.calculateAttackMode(car_state, race_context),
      overtake: this.shouldAttemptOvertake(rivals, track_segment, car_state),
      defend: this.shouldDefend(rivals, car_state),
      ers_strategy: this.calculateERS(car_state, track_segment, race_context),
      pit_decision: this.calculatePitDecision(car_state, race_context),
      risk_factor: this.calculateRiskFactor(car_state, weather, race_context),
      commentary: this.generateCommentary(input, 'Claude')
    };

    return decision;
  }

  private calculateBrakingStyle(car_state: any, segment: any, weather: any): 'early' | 'normal' | 'late' {
    if (weather.type === 'heavy_rain') return 'early';
    if (segment.curvature > 0.02) return 'early';
    return 'normal';
  }

  private calculateAttackMode(car_state: any, race_context: any): 'conservative' | 'balanced' | 'aggressive' {
    if (car_state.tyre_wear > 0.6 || car_state.fuel < 20) return 'conservative';
    if (race_context.position_in_race <= 3) return 'balanced';
    return 'aggressive';
  }

  private shouldAttemptOvertake(rivals: RivalInfo[], segment: TrackSegment, car_state: any): boolean {
    if (!segment.overtaking_zone) return false;
    const rivalAhead = rivals.find(r => r.distance_ahead_m && r.distance_ahead_m < 40);
    return rivalAhead !== undefined && car_state.ers > 0.4;
  }

  private shouldDefend(rivals: RivalInfo[], car_state: any): boolean {
    const threateningRival = rivals.find(r => r.distance_behind_m && r.distance_behind_m < 25);
    return threateningRival !== undefined && car_state.tyre_wear < 0.8;
  }

  private calculateERS(car_state: any, segment: TrackSegment, race_context: any): 'deploy' | 'harvest' | 'store' {
    if (segment.type === 'straight' && race_context.laps_remaining < 5) return 'deploy';
    if (segment.type.includes('corner')) return 'harvest';
    return 'store';
  }

  private calculatePitDecision(car_state: any, race_context: any): 'none' | 'tyre' | 'fuel' | 'repair' {
    if (car_state.damage > 0.3) return 'repair';
    if (car_state.tyre_wear > 0.75 && race_context.laps_remaining > 8) return 'tyre';
    return 'none';
  }

  private calculateRiskFactor(car_state: any, weather: any, race_context: any): number {
    let risk = 0.3; // Claude is more conservative
    if (weather.type === 'dry') risk += 0.1;
    if (race_context.laps_remaining < 10) risk += 0.2;
    if (car_state.damage > 0.2) risk -= 0.3;
    return Math.max(0, Math.min(1, risk));
  }

  private generateCommentary(input: LLMDriverInput, driverName: string): string {
    const scenarios = [
      'Strategic tyre management approach',
      'Calculated risk assessment',
      'Optimal racing line focus',
      'Efficient energy deployment',
      'Long-term race strategy'
    ];
    return `${driverName}: ${scenarios[Math.floor(Math.random() * scenarios.length)]}`;
  }
}

export class GeminiDriver implements LLMDriver {
  name = 'Gemini';
  llm_type: 'gemini' = 'gemini';

  async makeDecision(input: LLMDriverInput): Promise<LLMDriverDecision> {
    await new Promise(resolve => setTimeout(resolve, 120 + Math.random() * 180));

    const { car_state, track_segment, rivals, weather, race_context } = input;
    
    // Gemini-style decision logic (adaptive and data-driven)
    const decision: LLMDriverDecision = {
      braking_style: this.calculateBrakingStyle(car_state, track_segment, rivals),
      attack_mode: this.calculateAttackMode(race_context, car_state, weather),
      overtake: this.shouldAttemptOvertake(rivals, track_segment, car_state),
      defend: this.shouldDefend(rivals, car_state, track_segment),
      ers_strategy: this.calculateERS(car_state, track_segment, rivals),
      pit_decision: this.calculatePitDecision(car_state, race_context),
      risk_factor: this.calculateRiskFactor(car_state, weather, track_segment),
      commentary: this.generateCommentary(input, 'Gemini')
    };

    return decision;
  }

  private calculateBrakingStyle(car_state: any, segment: any, rivals: any): 'early' | 'normal' | 'late' {
    const trafficDensity = rivals.filter(r => r.distance_ahead_m && r.distance_ahead_m < 100).length;
    if (trafficDensity > 2) return 'early';
    if (segment.type === 'fast_corner' && car_state.tyre_temp > 100) return 'late';
    return 'normal';
  }

  private calculateAttackMode(race_context: any, car_state: any, weather: any): 'conservative' | 'balanced' | 'aggressive' {
    const positionScore = race_context.position_in_race / 4; // Normalize to 0-1
    const tyreScore = 1 - car_state.tyre_wear;
    const weatherScore = weather.type === 'dry' ? 1 : 0.5;
    
    const aggressionScore = (positionScore + tyreScore + weatherScore) / 3;
    
    if (aggressionScore > 0.7) return 'aggressive';
    if (aggressionScore < 0.3) return 'conservative';
    return 'balanced';
  }

  private shouldAttemptOvertake(rivals: RivalInfo[], segment: TrackSegment, car_state: any): boolean {
    if (!segment.overtaking_zone && segment.type !== 'straight') return false;
    const targetRival = rivals.find(r => r.distance_ahead_m && r.distance_ahead_m < 50);
    return targetRival !== undefined && car_state.ers > 0.2 && car_state.tyre_wear < 0.7;
  }

  private shouldDefend(rivals: RivalInfo[], car_state: any, segment: TrackSegment): boolean {
    if (segment.type === 'straight') return false; // Don't defend on straights
    const threateningRival = rivals.find(r => r.distance_behind_m && r.distance_behind_m < 30);
    return threateningRival !== undefined;
  }

  private calculateERS(car_state: any, segment: TrackSegment, rivals: any): 'deploy' | 'harvest' | 'store' {
    const deploymentScore = segment.drs ? 0.8 : segment.type === 'straight' ? 0.6 : 0.2;
    const rivalPressure = rivals.some((r: any) => r.distance_ahead_m < 30) ? 0.3 : 0;
    const batteryLevel = car_state.ers;
    
    if (deploymentScore + rivalPressure > 0.7 && batteryLevel > 0.3) return 'deploy';
    if (segment.type.includes('corner') && batteryLevel < 0.9) return 'harvest';
    return 'store';
  }

  private calculatePitDecision(car_state: any, race_context: any): 'none' | 'tyre' | 'fuel' | 'repair' {
    const urgencyScore = Math.max(car_state.damage, car_state.tyre_wear, 1 - car_state.fuel / 50);
    const lapsRemainingScore = race_context.laps_remaining / 30;
    
    if (urgencyScore > 0.8 && lapsRemainingScore > 0.3) {
      if (car_state.damage > 0.4) return 'repair';
      if (car_state.tyre_wear > 0.7) return 'tyre';
      if (car_state.fuel < 15) return 'fuel';
    }
    return 'none';
  }

  private calculateRiskFactor(car_state: any, weather: any, track_segment: any): number {
    const baseRisk = 0.4;
    const weatherRisk = weather.type === 'dry' ? 0.2 : -0.2;
    const tyreRisk = car_state.tyre_wear < 0.4 ? 0.3 : -0.1;
    const segmentRisk = track_segment.overtaking_zone ? 0.2 : 0;
    
    return Math.max(0, Math.min(1, baseRisk + weatherRisk + tyreRisk + segmentRisk));
  }

  private generateCommentary(input: LLMDriverInput, driverName: string): string {
    const scenarios = [
      'Data-driven approach to corner entry',
      'Optimizing energy recovery zones',
      'Analytical overtake assessment',
      'Predictive strategy adjustment',
      'Machine learning-based line optimization'
    ];
    return `${driverName}: ${scenarios[Math.floor(Math.random() * scenarios.length)]}`;
  }
}

export class QwenDriver implements LLMDriver {
  name = 'Qwen';
  llm_type: 'qwen' = 'qwen';

  async makeDecision(input: LLMDriverInput): Promise<LLMDriverDecision> {
    await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 220));

    const { car_state, track_segment, rivals, weather, race_context } = input;
    
    // Qwen-style decision logic (unpredictable and opportunistic)
    const decision: LLMDriverDecision = {
      braking_style: this.calculateBrakingStyle(car_state, track_segment),
      attack_mode: this.calculateAttackMode(car_state, race_context),
      overtake: this.shouldAttemptOvertake(rivals, track_segment),
      defend: this.shouldDefend(rivals, track_segment),
      ers_strategy: this.calculateERS(car_state, track_segment, rivals),
      pit_decision: this.calculatePitDecision(car_state, race_context),
      risk_factor: this.calculateRiskFactor(car_state, weather),
      commentary: this.generateCommentary(input, 'Qwen')
    };

    return decision;
  }

  private calculateBrakingStyle(car_state: any, segment: any): 'early' | 'normal' | 'late' {
    // Qwen is more unpredictable
    const random = Math.random();
    if (segment.type === 'hairpin') return random > 0.3 ? 'early' : 'normal';
    if (segment.type === 'straight') return random > 0.7 ? 'late' : 'normal';
    return random > 0.5 ? 'late' : 'normal';
  }

  private calculateAttackMode(car_state: any, race_context: any): 'conservative' | 'balanced' | 'aggressive' {
    const random = Math.random();
    if (race_context.position_in_race > 6 && random > 0.6) return 'aggressive';
    if (car_state.tyre_wear > 0.8) return 'conservative';
    return random > 0.5 ? 'aggressive' : 'balanced';
  }

  private shouldAttemptOvertake(rivals: RivalInfo[], segment: TrackSegment): boolean {
    const random = Math.random();
    const closeRival = rivals.find(r => r.distance_ahead_m && r.distance_ahead_m < 60);
    return closeRival !== undefined && random > 0.4;
  }

  private shouldDefend(rivals: RivalInfo[], segment: TrackSegment): boolean {
    const random = Math.random();
    const threateningRival = rivals.find(r => r.distance_behind_m && r.distance_behind_m < 40);
    return threateningRival !== undefined && random > 0.3;
  }

  private calculateERS(car_state: any, segment: TrackSegment, rivals: any): 'deploy' | 'harvest' | 'store' {
    const random = Math.random();
    if (random > 0.7 && car_state.ers > 0.3) return 'deploy';
    if (segment.type.includes('corner') && random > 0.6) return 'harvest';
    return 'store';
  }

  private calculatePitDecision(car_state: any, race_context: any): 'none' | 'tyre' | 'fuel' | 'repair' {
    const random = Math.random();
    if (car_state.damage > 0.6) return 'repair';
    if (random > 0.8 && car_state.tyre_wear > 0.6) return 'tyre';
    return 'none';
  }

  private calculateRiskFactor(car_state: any, weather: any): number {
    const baseRisk = 0.6; // Qwen is more risk-tolerant
    const randomFactor = (Math.random() - 0.5) * 0.4;
    const weatherFactor = weather.type === 'dry' ? 0.2 : -0.1;
    
    return Math.max(0, Math.min(1, baseRisk + randomFactor + weatherFactor));
  }

  private generateCommentary(input: LLMDriverInput, driverName: string): string {
    const scenarios = [
      'Opportunistic move attempt',
      'High-risk high-reward strategy',
      'Unconventional racing line',
      'Surprise attack maneuver',
      'Bold tactical decision'
    ];
    return `${driverName}: ${scenarios[Math.floor(Math.random() * scenarios.length)]}`;
  }
}

export class DriverManager {
  private drivers: Map<string, LLMDriver> = new Map();

  constructor() {
    this.initializeDrivers();
  }

  private initializeDrivers(): void {
    const chatgpt = new ChatGPTDriver();
    const claude = new ClaudeDriver();
    const gemini = new GeminiDriver();
    const qwen = new QwenDriver();

    this.drivers.set('chatgpt', chatgpt);
    this.drivers.set('claude', claude);
    this.drivers.set('gemini', gemini);
    this.drivers.set('qwen', qwen);
  }

  getDriver(llmType: string): LLMDriver | undefined {
    return this.drivers.get(llmType);
  }

  getAllDrivers(): LLMDriver[] {
    return Array.from(this.drivers.values());
  }

  async getDecisionFromDriver(
    llmType: string,
    input: LLMDriverInput
  ): Promise<LLMDriverDecision | null> {
    const driver = this.getDriver(llmType);
    if (!driver) return null;

    try {
      return await driver.makeDecision(input);
    } catch (error) {
      console.error(`Error getting decision from ${llmType}:`, error);
      return null;
    }
  }
}
