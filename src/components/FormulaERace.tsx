"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { 
  TrackJSON, 
  Driver, 
  DriverJSON, 
  RaceCar, 
  RaceResults, 
  DriverStrategy, 
  TrackSegment,
  Obstacle,
  Hazard,
  Weather,
  Car,
  RaceState
} from '@/types/race';
import { SimulationEngine, SimulationConfig, SimulationSnapshot } from '@/engine/SimulationEngine';
import { BaseAgent, AgentConfig } from '@/agents/BaseAgent';
import { RuleBasedAgent, RuleBasedAgentConfig } from '@/agents/RuleBasedAgent';
import { LLMAgent, LLMAgentConfig } from '@/agents/LLMAgent';
import { LLMStrategyEngine } from '@/engine/StrategyEngine';
import { VehicleModel, VehicleBehaviorType, EnergyModel, PerformanceProfile } from '@/engine/VehicleModel';
import { RuleBasedStrategyEngine } from '@/engine/StrategyEngine';
import Leaderboard from './Leaderboard';
import RaceControls from './RaceControls';
import WeatherIndicator from './WeatherIndicator';
import Telemetry from './Telemetry';
import PromptInput from './PromptInput';
import TrackSelector from './TrackSelector';
import { Card } from '@/components/ui/card';

export default function FormulaERace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  
  // Legacy state for compatibility with existing components
  const [raceCars, setRaceCars] = useState<RaceCar[]>([]);
  const [trackData, setTrackData] = useState<TrackJSON | null>(null);
  const [driverData, setDriverData] = useState<DriverJSON | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string>('/tracks/baku-city-circuit.json');
  const [raceState, setRaceState] = useState<RaceState>({
  status: 'stopped',
  speedMultiplier: 1,
  selectedCarId: null,
  weather: { type: 'clear', intensity: 0, windDirection: 0 }
});
  const [raceResults, setRaceResults] = useState<RaceResults | null>(null);
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [raceTime, setRaceTime] = useState(0);
  const [totalLaps] = useState(30); // Race distance

  const simulationEngineRef = useRef<SimulationEngine | null>(null);
  const [simulationSnapshot, setSimulationSnapshot] = useState<SimulationSnapshot | null>(null);
  const [aiModelStatus, setAiModelStatus] = useState<{[key: string]: 'ok' | 'error' | 'checking'}>({});
  const [isInitializingRace, setIsInitializingRace] = useState(false);

  // Load JSON data
  useEffect(() => {
    const loadData = async () => {
      try {
        const trackResponse = await fetch(selectedTrack);
        const track: TrackJSON = await trackResponse.json();
        setTrackData(track);

        // Generate AI strategies dynamically
        const drivers = await generateAIStrategies(track);
        setDriverData({ drivers });
        
        // Initialize race cars with legacy format
        initializeRaceCars(drivers, track);
        
        // Initialize simulation engine
        await initializeSimulation(drivers, track);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [selectedTrack]);

  // Initialize race cars (legacy format)
  const initializeRaceCars = (drivers: Driver[], track: TrackJSON) => {
    const cars: RaceCar[] = drivers.map((driver, index) => ({
      id: driver.id,
      driverId: driver.id,
      name: driver.name,
      color: `hsl(${(index * 360) / drivers.length}, 70%, 50%)`,
      position: { x: track.segments[0]?.startX || 0, y: track.segments[0]?.startY || 0 },
      currentSegment: 0,
      segmentProgress: 0,
      speed: 0,
      acceleration: 0,
      maxSpeed: 280 + (driver.id % 20),
      tireCompound: 'medium',
      tireWear: 0,
      fuel: 1.0,
      ers: 1.0,
      battery: 1.0,
      distance: 0,
      laps: 0,
      isInPit: false,
      pitStopTime: 0,
      angle: 0,
      energyConsumption: 0,
      overtakes: 0,
      positionsLost: 0,
      hazardsTriggered: 0,
      lapTimes: [],
      currentTime: 0,
      strategy: driver.strategy
    }));

    setRaceCars(cars);
  };

  // Create agents from driver data
  const createAgents = async (drivers: Driver[]): Promise<BaseAgent[]> => {
    const agents: BaseAgent[] = [];
    
    for (const driver of drivers) {
      // Check if driver should use LLM
      if (driver.aiModel !== 'Human' && driver.aiModel !== 'Unknown') {
        console.log(`Creating LLM agent for ${driver.name} using ${driver.aiModel}`);
        
        // Create fallback strategy engine
        const fallbackStrategy = new RuleBasedStrategyEngine();
        
        // Create LLMAgent config
        const llmConfig: LLMAgentConfig = {
          id: driver.id,
          name: driver.name,
          behaviorType: 'car' as VehicleBehaviorType,
          vehicleConfig: {
            mass: 800 + (driver.id % 100),
            maxSpeed: 280 + (driver.id % 20),
            accelerationProfile: {
              acceleration: 15 + (driver.id % 5),
              deceleration: 20 + (driver.id % 5),
              maxSpeed: 280 + (driver.id % 20),
              turningRadius: 5 + (driver.id % 3)
            },
            brakingProfile: {
              acceleration: 20 + (driver.id % 5),
              deceleration: 25 + (driver.id % 5),
              maxSpeed: 280 + (driver.id % 20),
              turningRadius: 5 + (driver.id % 3)
            },
            turningRadius: 5 + (driver.id % 3),
            dragCoefficient: 0.3 + (driver.id % 5) * 0.02,
            gripCoefficient: 1.2 + (driver.id % 3) * 0.1,
            energyModel: {
              type: 'battery' as const,
              capacity: 100,
              currentLevel: 100,
              consumptionRate: 0.1 + (driver.id % 5) * 0.01,
              regenerationRate: 0.05 + (driver.id % 3) * 0.01
            }
          },
          strategyEngine: new LLMStrategyEngine('/api/llm', driver.aiModel), // Use LLM strategy engine
          apiEndpoint: '/api/llm', // Would need to implement this endpoint
          modelType: driver.aiModel,
          updateTriggers: {
            weatherChange: true,
            pitDecision: true,
            overtakingOpportunity: true,
            batteryLow: true,
            timeInterval: 10 // Update every 10 seconds (reduced from 5)
          },
          fallbackStrategy: fallbackStrategy
        };
        
        const llmAgent = new LLMAgent(llmConfig);
        
        // Initialize LLM agent (this will test API connection and fallback if needed)
        try {
          await llmAgent.initialize();
        } catch (error) {
          console.error(`Failed to initialize LLM agent ${driver.name}:`, error);
        }
        
        agents.push(llmAgent);
      } else {
        // Create RuleBasedAgent for Human or Unknown drivers
        const strategyEngine = new RuleBasedStrategyEngine();
        const agentConfig: RuleBasedAgentConfig = {
          id: driver.id,
          name: driver.name,
          behaviorType: 'car' as VehicleBehaviorType,
          vehicleConfig: {
            mass: 800 + (driver.id % 100),
            maxSpeed: 280 + (driver.id % 20),
            accelerationProfile: {
              acceleration: 15 + (driver.id % 5),
              deceleration: 20 + (driver.id % 5),
              maxSpeed: 280 + (driver.id % 20),
              turningRadius: 5 + (driver.id % 3)
            },
            brakingProfile: {
              acceleration: 20 + (driver.id % 5),
              deceleration: 25 + (driver.id % 5),
              maxSpeed: 280 + (driver.id % 20),
              turningRadius: 5 + (driver.id % 3)
            },
            turningRadius: 5 + (driver.id % 3),
            dragCoefficient: 0.3 + (driver.id % 5) * 0.02,
            gripCoefficient: 1.2 + (driver.id % 3) * 0.1,
            energyModel: {
              type: 'battery' as const,
              capacity: 100,
              currentLevel: 100,
              consumptionRate: 0.1 + (driver.id % 5) * 0.01,
              regenerationRate: 0.05 + (driver.id % 3) * 0.01
            }
          },
          strategyEngine: strategyEngine, // Required by AgentConfig
          aggressiveness: driver.strategy?.aggression > 0.7 ? 'aggressive' : driver.strategy?.aggression > 0.3 ? 'balanced' : 'conservative',
          tireManagement: driver.strategy?.tireManagement > 0.7 ? 'excellent' : driver.strategy?.tireManagement > 0.3 ? 'average' : 'poor',
          fuelStrategy: driver.strategy?.fuelManagement > 0.7 ? 'long' : driver.strategy?.fuelManagement > 0.3 ? 'medium' : 'short',
          overtakingSkill: driver.strategy?.overtakingSkill > 0.7 ? 'bold' : driver.strategy?.overtakingSkill > 0.3 ? 'normal' : 'cautious',
          defensiveSkill: driver.strategy?.defensiveSkill > 0.7 ? 'strong' : driver.strategy?.defensiveSkill > 0.3 ? 'average' : 'weak'
        };
        
        agents.push(new RuleBasedAgent(agentConfig));
      }
    }
    
    return agents;
  };

  // Generate race results from snapshot
  const generateRaceResults = (snapshot: SimulationSnapshot): RaceResults => {
    const sortedVehicles = [...snapshot.vehicles].sort((a, b) => {
      if (b.laps !== a.laps) return b.laps - a.laps;
      return b.distance - a.distance;
    });

    const drivers = driverData?.drivers || [];
    const finalStandings = sortedVehicles.map((vehicle, index) => {
      const driver = drivers.find(d => d.id === vehicle.id);
      return {
        driver: driver || { id: vehicle.id, name: vehicle.name, aiModel: 'Unknown', color: '#000', strategy: {} as DriverStrategy, skill: 0.5 },
        position: index + 1,
        laps: vehicle.laps,
        totalTime: 0, // Not available in snapshot
        fastestLap: 0, // Not available in snapshot
        overtakes: vehicle.overtakes,
        hazardsTriggered: 0, // Not available in snapshot
        tireWear: vehicle.tireWear,
        fuelRemaining: vehicle.energyLevel / 100
      };
    });

    return {
      winner: drivers.find(d => d.id === sortedVehicles[0].id) || drivers[0],
      finalStandings,
      lapTimes: []
    };
  };

  // Validate AI models before race start
  const validateAIModels = async (drivers: Driver[]): Promise<void> => {
    const aiDrivers = drivers.filter(d => d.aiModel !== 'Human' && d.aiModel !== 'Unknown');
    
    if (aiDrivers.length === 0) {
      console.log('No AI drivers found - proceeding with human drivers only');
      setAiModelStatus({});
      return;
    }

    setIsInitializingRace(true);
    
    try {
      console.log('Validating AI model connectivity...');
      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });

      if (!response.ok) {
        throw new Error(`AI validation failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('AI Model validation result:', result);

      // Update AI model status
      const status: {[key: string]: 'ok' | 'error' | 'checking'} = {};
      if (result.models) {
        result.models.forEach((model: any) => {
          status[model.model] = model.status;
        });
      }
      setAiModelStatus(status);

      // Check if required models are available
      const availableModels = result.models?.map((m: any) => m.model.toLowerCase()) || [];
      const requiredModels = [...new Set(aiDrivers.map(d => d.aiModel.toLowerCase()))];
      
      const missingModels = requiredModels.filter(model => 
        !availableModels.includes(model.toLowerCase()) && 
        !['chatgpt', 'openai'].includes(model.toLowerCase()) && 
        !['gemini', 'google'].includes(model.toLowerCase())
      );

      if (missingModels.length > 0) {
        console.warn(`Some AI models not available: ${missingModels.join(', ')}. These drivers will use rule-based fallback.`);
      }

      console.log(`✅ AI validation complete. ${availableModels.length} models available.`);
    } catch (error) {
      console.error('AI model validation failed:', error);
      // Set error status for all AI models
      const errorStatus: {[key: string]: 'ok' | 'error' | 'checking'} = {};
      aiDrivers.forEach(driver => {
        errorStatus[driver.aiModel] = 'error';
      });
      setAiModelStatus(errorStatus);
      throw new Error(`AI model validation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check API keys and network connectivity.`);
    } finally {
      setIsInitializingRace(false);
    }
  };

  // Initialize simulation engine
  const initializeSimulation = async (drivers: Driver[], track: TrackJSON) => {
    // Validate AI models first
    await validateAIModels(drivers);
    
    const agents = await createAgents(drivers);
    
    const config: SimulationConfig = {
      fixedTimestep: 0.016, // 60 FPS
      speedMultiplier: speedMultiplier,
      totalLaps: totalLaps,
      weatherProfile: {
        initialWeather: { type: 'clear', intensity: 0 },
        changeProbability: 0.01
      },
      eventProbabilities: {
        breakdown: 0.001,
        obstacleAppear: 0.02, // Increased from 0.002 for testing
        batteryLow: 0.005,
        collision: 0.008
      }
    };

    // Convert legacy track to extended format for simulation engine
    const extendedTrack = convertToExtendedTrack(track);
    const engine = new SimulationEngine(config);
    
    // Create vehicle configs from driver data
    const vehicleConfigs = drivers.map((driver, index) => {
      const agentConfig: RuleBasedAgentConfig = {
        id: driver.id,
        name: driver.name,
        behaviorType: 'car' as VehicleBehaviorType,
        vehicleConfig: {
          mass: 800 + (driver.id % 100),
          maxSpeed: 280 + (driver.id % 20),
          accelerationProfile: {
            acceleration: 15 + (driver.id % 5),
            deceleration: 20 + (driver.id % 5),
            maxSpeed: 280 + (driver.id % 20),
            turningRadius: 5 + (driver.id % 3)
          },
          brakingProfile: {
            acceleration: 20 + (driver.id % 5),
            deceleration: 25 + (driver.id % 5),
            maxSpeed: 280 + (driver.id % 20),
            turningRadius: 5 + (driver.id % 3)
          },
          turningRadius: 5 + (driver.id % 3),
          dragCoefficient: 0.3 + (driver.id % 5) * 0.02,
          gripCoefficient: 1.2 + (driver.id % 3) * 0.1,
          energyModel: {
            type: 'battery' as const,
            capacity: 100,
            currentLevel: 100,
            consumptionRate: 0.1 + (driver.id % 5) * 0.01,
            regenerationRate: 0.05 + (driver.id % 3) * 0.01
          }
        },
        strategyEngine: new RuleBasedStrategyEngine(),
        aggressiveness: driver.id % 3 === 0 ? 'aggressive' : driver.id % 3 === 1 ? 'balanced' : 'conservative',
        tireManagement: driver.id % 3 === 0 ? 'excellent' : driver.id % 3 === 1 ? 'average' : 'poor',
        fuelStrategy: driver.id % 3 === 0 ? 'long' : driver.id % 3 === 1 ? 'medium' : 'short',
        overtakingSkill: driver.id % 3 === 0 ? 'bold' : driver.id % 3 === 1 ? 'normal' : 'cautious',
        defensiveSkill: driver.id % 3 === 0 ? 'strong' : driver.id % 3 === 1 ? 'average' : 'weak'
      };
      
      return {
        id: agentConfig.id,
        name: agentConfig.name,
        behaviorType: agentConfig.behaviorType,
        mass: agentConfig.vehicleConfig.mass,
        maxSpeed: agentConfig.vehicleConfig.maxSpeed,
        accelerationProfile: agentConfig.vehicleConfig.accelerationProfile,
        brakingProfile: agentConfig.vehicleConfig.brakingProfile,
        turningRadius: agentConfig.vehicleConfig.turningRadius,
        dragCoefficient: agentConfig.vehicleConfig.dragCoefficient,
        gripCoefficient: agentConfig.vehicleConfig.gripCoefficient,
        energyModel: agentConfig.vehicleConfig.energyModel,
        agentId: agentConfig.id
      };
    });
    
    // Initialize the simulation with vehicles and track
    engine.initialize(vehicleConfigs, extendedTrack.segments);
    
    // Store agents for decision making
    (engine as any).agents = agents;
    
    // Set up state update callback
    engine.setStateUpdateCallback((snapshot: SimulationSnapshot) => {
      setSimulationSnapshot(snapshot);
      setRaceTime(snapshot.elapsedTime);
      
      // Update legacy race cars from simulation snapshot
      updateLegacyRaceCars(snapshot);
      
      // Check race completion
      if (snapshot.raceState === 'finished') {
        setRaceState(prev => ({ ...prev, status: 'finished' }));
        setRaceResults(generateRaceResults(snapshot));
      }
    });

    simulationEngineRef.current = engine;
  };

  // Update legacy race cars from simulation snapshot
  const updateLegacyRaceCars = (snapshot: SimulationSnapshot) => {
    setRaceCars(prevCars => 
      prevCars.map(car => {
        const simVehicle = snapshot.vehicles.find(v => v.id === car.id);
        if (!simVehicle) return car;

        return {
          ...car,
          position: { x: simVehicle.position.x, y: simVehicle.position.y },
          currentSegment: simVehicle.currentSegment,
          segmentProgress: simVehicle.segmentProgress,
          speed: simVehicle.speed,
          acceleration: 0, // Not available in snapshot
          tireWear: simVehicle.tireWear,
          fuel: simVehicle.energyLevel / 100,
          battery: simVehicle.energyLevel / 100,
          distance: simVehicle.distance,
          laps: simVehicle.laps,
          isInPit: simVehicle.isInPit,
          pitStopTime: 0, // Not available in snapshot
          angle: simVehicle.angle,
          energyConsumption: 0, // Not available in snapshot
          overtakes: simVehicle.overtakes,
          positionsLost: simVehicle.positionsLost,
          hazardsTriggered: 0, // Not available in snapshot
          lapTimes: [], // Not available in snapshot
          currentTime: 0 // Not available in snapshot
        };
      })
    );
  };

  // Convert legacy track to extended format
  const convertToExtendedTrack = (legacyTrack: TrackJSON) => {
    return {
      name: legacyTrack.name,
      location: 'Unknown',
      country: 'Unknown',
      length: legacyTrack.totalLength,
      numberOfLaps: totalLaps,
      raceDistance: legacyTrack.totalLength * totalLaps,
      segments: legacyTrack.segments.map(s => ({
        ...s,
        type: s.type as any,
        surfaceType: 'asphalt' as const,
        surfaceCondition: 'dry' as const,
        altitude: 0,
        altitudeChange: 0,
        bankAngle: 0,
        hazardLevel: 0.1,
        overtakingOpportunity: s.type === 'straight' ? 0.7 : 0.3,
        defensiveDifficulty: s.type === 'corner' ? 0.6 : 0.2,
        grip: s.gripLevel || 1.0,
        windVector: { x: 0, y: 0 }
      })),
      drsZones: [], // Convert DRS zones from segments if needed
      pitLane: {
        entry: { segmentId: legacyTrack.pitLaneEntry || 0, position: 0.5 },
        exit: { segmentId: legacyTrack.pitLaneExit || 0, position: 0.5 },
        speedLimit: 80
      },
      obstacles: legacyTrack.obstacles || [],
      hazards: legacyTrack.hazards || []
    };
  };

  // Generate AI strategies
  const generateAIStrategies = async (track: TrackJSON): Promise<Driver[]> => {
    const strategies: DriverStrategy[] = [
      { 
        aggression: 0.8, 
        tireManagement: 0.3, 
        fuelManagement: 0.4,
        overtakingSkill: 0.8,
        defensiveSkill: 0.5,
        wetWeatherSkill: 0.6,
        drsUsage: 0.9,
        pitStrategy: {
          initialTire: 'soft',
          targetLaps: 15,
          fuelLoad: 0.8
        }
      },
      { 
        aggression: 0.5, 
        tireManagement: 0.6, 
        fuelManagement: 0.6,
        overtakingSkill: 0.6,
        defensiveSkill: 0.6,
        wetWeatherSkill: 0.7,
        drsUsage: 0.7,
        pitStrategy: {
          initialTire: 'medium',
          targetLaps: 20,
          fuelLoad: 0.9
        }
      },
      { 
        aggression: 0.3, 
        tireManagement: 0.8, 
        fuelManagement: 0.8,
        overtakingSkill: 0.4,
        defensiveSkill: 0.8,
        wetWeatherSkill: 0.8,
        drsUsage: 0.5,
        pitStrategy: {
          initialTire: 'hard',
          targetLaps: 25,
          fuelLoad: 1.0
        }
      },
      { 
        aggression: 0.9, 
        tireManagement: 0.2, 
        fuelManagement: 0.3,
        overtakingSkill: 0.9,
        defensiveSkill: 0.3,
        wetWeatherSkill: 0.4,
        drsUsage: 1.0,
        pitStrategy: {
          initialTire: 'soft',
          targetLaps: 12,
          fuelLoad: 0.7
        }
      },
      { 
        aggression: 0.4, 
        tireManagement: 0.9, 
        fuelManagement: 0.9,
        overtakingSkill: 0.5,
        defensiveSkill: 0.9,
        wetWeatherSkill: 0.9,
        drsUsage: 0.4,
        pitStrategy: {
          initialTire: 'hard',
          targetLaps: 30,
          fuelLoad: 1.0
        }
      }
    ];

    return strategies.map((strategy, index) => ({
      id: index + 1,
      name: `AI Driver ${index + 1}`,
      aiModel: index % 3 === 0 ? 'ChatGPT' : index % 3 === 1 ? 'Gemini' : 'Qwen',
      color: `hsl(${(index * 360) / strategies.length}, 70%, 50%)`,
      strategy: strategy,
      skill: 0.5 + (index * 0.1)
    }));
  };

  // Race control functions
  const startRace = useCallback(() => {
    if (simulationEngineRef.current && raceState.status === 'stopped') {
      simulationEngineRef.current.start();
      setRaceState(prev => ({ ...prev, status: 'running' }));
    }
  }, [raceState]);

  const pauseRace = useCallback(() => {
    if (simulationEngineRef.current && raceState.status === 'running') {
      simulationEngineRef.current.pause();
      setRaceState(prev => ({ ...prev, status: 'paused' }));
    }
  }, [raceState]);

  const resumeRace = useCallback(() => {
    if (simulationEngineRef.current && raceState.status === 'paused') {
      simulationEngineRef.current.resume();
      setRaceState(prev => ({ ...prev, status: 'running' }));
    }
  }, [raceState]);

  const stopRace = useCallback(() => {
    if (simulationEngineRef.current) {
      simulationEngineRef.current.stop();
      setRaceState(prev => ({ ...prev, status: 'stopped' }));
      setRaceResults(null);
      setRaceTime(0);
    }
  }, []);

  const resetRace = useCallback(() => {
    if (simulationEngineRef.current && trackData && driverData) {
      simulationEngineRef.current.reset();
      setRaceState(prev => ({ ...prev, status: 'stopped' }));
      setRaceResults(null);
      setRaceTime(0);
      initializeRaceCars(driverData.drivers, trackData);
      initializeSimulation(driverData.drivers, trackData);
    }
  }, [trackData, driverData]);

  // Update speed multiplier
  useEffect(() => {
    if (simulationEngineRef.current) {
      // Note: setSpeedMultiplier method needs to be added to SimulationEngine
      // simulationEngineRef.current.setSpeedMultiplier(speedMultiplier);
    }
  }, [speedMultiplier]);

  // Drawing functions
  const drawTrack = (ctx: CanvasRenderingContext2D, track: TrackJSON) => {
    // Calculate track bounds
    const bounds = {
      minX: Math.min(...track.segments.map(s => Math.min(s.startX, s.endX))),
      maxX: Math.max(...track.segments.map(s => Math.max(s.startX, s.endX))),
      minY: Math.min(...track.segments.map(s => Math.min(s.startY, s.endY))),
      maxY: Math.max(...track.segments.map(s => Math.max(s.startY, s.endY)))
    };
    
    const trackWidth = bounds.maxX - bounds.minX;
    const trackHeight = bounds.maxY - bounds.minY;
    
    // Calculate scale to fit track in canvas
    const canvas = ctx.canvas;
    const padding = 40;
    const scaleX = (canvas.width - padding * 2) / trackWidth;
    const scaleY = (canvas.height - padding * 2) / trackHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Apply transformation
    ctx.save();
    ctx.translate(padding, padding);
    ctx.scale(scale, scale);
    ctx.translate(-bounds.minX, -bounds.minY);
    
    // Draw track
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 40 / scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    track.segments.forEach((segment, index) => {
      if (index === 0) {
        ctx.moveTo(segment.startX, segment.startY);
      }
      ctx.lineTo(segment.endX, segment.endY);
    });
    ctx.stroke();

    // Draw track borders
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2 / scale;
    ctx.stroke();

    // Draw DRS zones
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3 / scale;
    ctx.setLineDash([10 / scale, 5 / scale]);
    
    track.segments.forEach(segment => {
      if (segment.drsZone) {
        ctx.beginPath();
        ctx.moveTo(segment.startX, segment.startY);
        ctx.lineTo(segment.endX, segment.endY);
        ctx.stroke();
      }
    });
    
    ctx.setLineDash([]);
    
    // Draw obstacles on track
    track.segments.forEach((segment, index) => {
      // Check if there's an obstacle on this segment
      const simSnapshot = simulationSnapshot;
      if (simSnapshot) {
        // Check if any vehicle has hit an obstacle on this segment
        const vehicleWithObstacle = simSnapshot.vehicles.find(v => 
          v.currentSegment === index && (v as any).obstacleHit
        );
        
        if (vehicleWithObstacle) {
          // Draw obstacle indicator
          const midX = (segment.startX + segment.endX) / 2;
          const midY = (segment.startY + segment.endY) / 2;
          
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(midX, midY, 15 / scale, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#fff';
          ctx.font = `${12 / scale}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('!', midX, midY);
        }
      }
    });
    
    ctx.restore();
  };

  const drawVehicle = (ctx: CanvasRenderingContext2D, car: RaceCar, isSelected: boolean) => {
    if (!trackData) return;
    
    // Calculate track bounds and scale (same as drawTrack)
    const bounds = {
      minX: Math.min(...trackData.segments.map(s => Math.min(s.startX, s.endX))),
      maxX: Math.max(...trackData.segments.map(s => Math.max(s.startX, s.endX))),
      minY: Math.min(...trackData.segments.map(s => Math.min(s.startY, s.endY))),
      maxY: Math.max(...trackData.segments.map(s => Math.max(s.startY, s.endY)))
    };
    
    const trackWidth = bounds.maxX - bounds.minX;
    const trackHeight = bounds.maxY - bounds.minY;
    
    const canvas = ctx.canvas;
    const padding = 40;
    const scaleX = (canvas.width - padding * 2) / trackWidth;
    const scaleY = (canvas.height - padding * 2) / trackHeight;
    const scale = Math.min(scaleX, scaleY);
    
    ctx.save();
    ctx.translate(padding, padding);
    ctx.scale(scale, scale);
    ctx.translate(-bounds.minX, -bounds.minY);
    
    // Draw vehicle with AI behavior color coding
    let vehicleColor = car.color;
    
    // Check if vehicle is AI controlled
    const driver = driverData?.drivers.find(d => d.id === car.driverId);
    if (driver && driver.aiModel !== 'Human') {
      // Add AI indicator - slight glow effect
      ctx.shadowColor = car.color;
      ctx.shadowBlur = 10 / scale;
      
      // Different colors based on AI strategy
      if (driver.strategy?.aggression > 0.5) {
        vehicleColor = '#ff6b6b'; // Red for aggressive
      } else if (driver.strategy?.aggression < 0.3) {
        vehicleColor = '#4ecdc4'; // Teal for conservative
      } else {
        vehicleColor = '#95e77e'; // Green for balanced
      }
    }
    
    // Draw vehicle as colored circle
    ctx.fillStyle = isSelected ? '#ff0000' : vehicleColor;
    ctx.beginPath();
    ctx.arc(car.position.x, car.position.y, 8 / scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Draw AI indicator
    if (driver && driver.aiModel !== 'Human') {
      ctx.fillStyle = '#fff';
      ctx.font = `${8 / scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('AI', car.position.x, car.position.y - 15 / scale);
    }
    
    // Draw selection indicator
    if (isSelected) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2 / scale;
      ctx.beginPath();
      ctx.arc(car.position.x, car.position.y, 12 / scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawWeatherEffects = (ctx: CanvasRenderingContext2D, weather: any) => {
    if (weather.type === 'rain') {
      ctx.fillStyle = 'rgba(100, 100, 255, 0.1)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  };

  // Canvas rendering
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw track
    if (trackData) {
      drawTrack(ctx, trackData);
    }

    // Draw vehicles
    raceCars.forEach(car => {
      drawVehicle(ctx, car, car.id === selectedCarId);
    });

    // Draw weather effects
    if (simulationSnapshot) {
      drawWeatherEffects(ctx, simulationSnapshot.weather);
    }
  }, [raceCars, trackData, selectedCarId, simulationSnapshot]);

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    render();

    if (raceState.status === 'running') {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [render, raceState]);

  // Start animation loop
  useEffect(() => {
    if (raceState.status === 'running') {
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, raceState]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        render();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  // Get selected vehicle for telemetry
  const selectedVehicle = raceCars.find(car => car.id === selectedCarId);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Formula E Race Simulator</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main race view */}
          <div className="lg:col-span-2">
            <Card className="p-4">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full h-96 bg-gray-800 rounded"
              />
              
              <RaceControls
                raceState={raceState}
                onStart={startRace}
                onPause={pauseRace}
                onReset={resetRace}
                onSpeedChange={setSpeedMultiplier}
              />
            </Card>

            {/* Telemetry */}
            {selectedVehicle && (
              <Card className="p-4 mt-4">
                <Telemetry car={selectedVehicle} />
              </Card>
            )}
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Track selector */}
            <Card className="p-4">
              <TrackSelector
                selectedTrack={selectedTrack}
                onTrackSelect={setSelectedTrack}
              />
            </Card>

            {/* Weather indicator */}
            {simulationSnapshot && (
              <Card className="p-4">
                <WeatherIndicator weather={simulationSnapshot.weather} />
              </Card>
            )}

            {/* AI Model Status */}
            {(Object.keys(aiModelStatus).length > 0 || isInitializingRace) && (
              <Card className="p-4">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI Models Status
                  </h3>
                  
                  {isInitializingRace ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validating AI models...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(aiModelStatus).map(([model, status]) => (
                        <div key={model} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{model}</span>
                          <div className="flex items-center gap-2">
                            {status === 'ok' && (
                              <>
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-green-500">Connected</span>
                              </>
                            )}
                            {status === 'error' && (
                              <>
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span className="text-xs text-red-500">Error</span>
                              </>
                            )}
                            {status === 'checking' && (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
                                <span className="text-xs text-yellow-500">Checking</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {Object.keys(aiModelStatus).length > 0 && (
                    <div className="text-xs text-muted-foreground mt-2">
                      AI models are used for real-time race decisions
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Leaderboard */}
            {raceCars.length > 0 && (
              <Card className="p-4">
                <Leaderboard
                  cars={raceCars}
                  selectedCarId={selectedCarId}
                  onCarSelect={setSelectedCarId}
                />
              </Card>
            )}

            {/* AI Behavior Legend */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">AI Behavior Legend</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#ff6b6b]"></div>
                  <span>Aggressive AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#95e77e]"></div>
                  <span>Balanced AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#4ecdc4]"></div>
                  <span>Conservative AI</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-4 h-4 rounded-full bg-[#ff0000]"></div>
                  <span>Obstacle (!)</span>
                </div>
              </div>
            </Card>

            {/* Race results */}
            {raceResults && (
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-2">Race Results</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Winner:</strong> {raceResults.winner.name}</p>
                  <p><strong>Total Time:</strong> {raceResults.finalStandings[0]?.totalTime.toFixed(2)}s</p>
                  {raceResults.finalStandings[0]?.fastestLap && (
                    <p><strong>Fastest Lap:</strong> {raceResults.finalStandings[0].fastestLap.toFixed(2)}s</p>
                  )}
                </div>
              </Card>
            )}

            {/* AI prompt input */}
            <Card className="p-4">
              <PromptInput />
            </Card>

            {/* Debug Panel */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">Debug Info</h3>
              <div className="space-y-1 text-xs">
                <div>AI Agents: {driverData?.drivers.filter(d => d.aiModel !== 'Human').length || 0}</div>
                <div>Obstacle Probability: 0.02/frame (increased for testing)</div>
                <div>Active Obstacles: Check track for red circles</div>
                <div className="mt-2">
                  <strong>AI Decision Making:</strong>
                  <ul className="ml-2 list-disc">
                    <li>Speed adjustments based on hazards</li>
                    <li>Overtaking attempts</li>
                    <li>DRS activation</li>
                    <li>Pit stop decisions</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}