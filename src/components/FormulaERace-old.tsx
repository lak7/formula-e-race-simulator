"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Driver, 
  DriverJSON, 
  RaceResults, 
  DriverStrategy
} from '@/types/race';
import { ExtendedTrackJSON, TrackProcessor } from '@/types/track';
import { SimulationEngine, SimulationConfig, SimulationSnapshot } from '@/engine/SimulationEngine';
import { BaseAgent, AgentConfig } from '@/agents/BaseAgent';
import { RuleBasedAgent, RuleBasedAgentConfig } from '@/agents/RuleBasedAgent';
import Leaderboard from './Leaderboard';
import RaceControls from './RaceControls';
import WeatherIndicator from './WeatherIndicator';
import Telemetry from './Telemetry';
import PromptInput from './PromptInput';
import TrackSelector from './TrackSelector';
import { Card } from '@/components/ui/card';

export default function FormulaERace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  // Simulation engine state
  const simulationEngineRef = useRef<SimulationEngine | null>(null);
  const [simulationSnapshot, setSimulationSnapshot] = useState<SimulationSnapshot | null>(null);
  const [trackData, setTrackData] = useState<ExtendedTrackJSON | null>(null);
  const [driverData, setDriverData] = useState<DriverJSON | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string>('/tracks/baku-city-circuit.json');
  const [raceState, setRaceState] = useState<'stopped' | 'running' | 'paused' | 'finished'>('stopped');
  const [raceResults, setRaceResults] = useState<RaceResults | null>(null);
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [raceTime, setRaceTime] = useState(0);
  const [totalLaps] = useState(30); // Race distance

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
        initializeRaceCars(drivers, track);
      } catch (error) {
        console.error('Failed to load race data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error(`Race Loading Error: ${errorMessage}`);
        
        // Show detailed error in UI
        alert(`Failed to initialize race: ${errorMessage}\n\nPlease check your API keys in the .env file:\n- OPENAI_API_KEY\n- GOOGLE_AI_API_KEY\n- QWEN_API_KEY\n\nAnd ensure you have network access to AI services.`);
        
        // Don't proceed with race initialization
        return;
      }
    };
    
    loadData();
  }, [selectedTrack]);

  // Fallback to static data
  const loadFallbackData = async () => {
    try {
      const trackResponse = await fetch('/sample-track.json');
      const driversResponse = await fetch('/sample-drivers.json');
      
      const track: TrackJSON = await trackResponse.json();
      const drivers: DriverJSON = await driversResponse.json();
      
      setTrackData(track);
      setDriverData(drivers);
      initializeRaceCars(drivers.drivers, track);
    } catch (error) {
      console.error('Failed to load fallback data:', error);
    }
  };

  // Generate AI strategies
  const generateAIStrategies = async (track: TrackJSON): Promise<Driver[]> => {
    const trackInfo = `
Track: ${track.name}
Length: ${track.totalLength}m
Segments: ${track.segments.length} segments with ${track.segments.filter(s => s.type === 'corner').length} corners
DRS Zones: ${track.segments.filter(s => s.drsZone).length} zones
Obstacles: ${track.obstacles.length} obstacles
Hazards: ${track.hazards.length} hazards
Average Grip: ${(track.segments.reduce((sum, s) => sum + s.gripLevel, 0) / track.segments.length).toFixed(2)}
    `;

    const aiModels = [
      { name: 'ChatGPT', aiModel: 'chatgpt', color: '#10b981', modelType: 'chatgpt' },
      { name: 'Gemini 2.0 Flash Lite', aiModel: 'gemini', color: '#3b82f6', modelType: 'gemini' },
    ];

    const drivers: Driver[] = [];
    const errors: string[] = [];

    for (const ai of aiModels) {
      try {
        console.log(`Generating strategy for ${ai.name} (${ai.modelType})...`);
        
        const response = await fetch('/api/ai-strategy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trackInfo,
            aiModel: ai.modelType
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Validate strategy structure
        if (!data.strategy || typeof data.strategy !== 'object') {
          throw new Error('Invalid strategy structure returned from AI');
        }

        drivers.push({
          id: drivers.length + 1,
          name: ai.name,
          aiModel: ai.aiModel,
          color: ai.color,
          strategy: data.strategy
        });
        
        console.log(`${ai.name} strategy generated successfully:`, data.strategy);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const detailedError = `${ai.name} (${ai.modelType}) Strategy Generation Failed: ${errorMessage}`;
        console.error(detailedError);
        errors.push(detailedError);
        
        // Don't add fallback driver - fail completely
        throw new Error(`AI Strategy Generation Failed\n\n${errors.join('\n')}\n\nPlease check your API keys and network connectivity.`);
      }
    }

    if (drivers.length === 0) {
      throw new Error('No AI strategies were successfully generated. Race cannot proceed.');
    }

    return drivers;
  };

  // Initialize race cars from driver data
  const initializeRaceCars = useCallback((drivers: Driver[], track: TrackJSON) => {
    const cars: RaceCar[] = drivers.map((driver, index) => ({
      id: driver.id,
      driverId: driver.id,
      name: driver.name,
      color: driver.color,
      position: { x: track.segments[0].startX, y: track.segments[0].startY },
      currentSegment: 0,
      segmentProgress: index * 0.1, // Stagger start positions
      speed: 0,
      acceleration: 0,
      maxSpeed: 350, // km/h base speed
      tireCompound: driver.strategy.pitStrategy.initialTire,
      tireWear: 0,
      fuel: driver.strategy.pitStrategy.fuelLoad,
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
  }, []);

  // Physics calculations
  const calculateSpeed = useCallback((car: RaceCar, segment: TrackSegment): number => {
    let targetSpeed = car.maxSpeed;
    
    // Apply segment speed limit
    if (segment.speedLimit) {
      targetSpeed = Math.min(targetSpeed, segment.speedLimit);
    }
    
    // Apply grip level
    const gripFactor = segment.gripLevel * (1 - car.tireWear * 0.5);
    targetSpeed *= gripFactor;
    
    // Apply corner speed reduction
    if (segment.type === 'corner' && segment.cornerRadius) {
      const cornerSpeed = Math.sqrt(segment.cornerRadius * 9.81 * segment.gripLevel) * 3.6; // Convert to km/h
      targetSpeed = Math.min(targetSpeed, cornerSpeed);
    }
    
    // Apply DRS
    if (segment.drsZone && car.segmentProgress >= (segment.drsStart || 0) && 
        car.segmentProgress <= (segment.drsEnd || 1)) {
      targetSpeed *= (1 + car.strategy.drsUsage * 0.15);
    }
    
    // Apply strategy factors
    const aggressionFactor = 0.8 + car.strategy.aggression * 0.4;
    targetSpeed *= aggressionFactor;
    
    return targetSpeed;
  }, []);

  // Update car positions
  const updateRaceCars = useCallback((deltaTime: number) => {
    if (!trackData) return;
    
    setRaceCars(prevCars => {
      return prevCars.map(car => {
        if (car.isInPit) {
          // Handle pit stop
          const newPitTime = car.pitStopTime - deltaTime;
          if (newPitTime <= 0) {
            return { ...car, isInPit: false, pitStopTime: 0, tireWear: 0, fuel: 1.0 };
          }
          return { ...car, pitStopTime: newPitTime };
        }
        
        const segment = trackData.segments[car.currentSegment];
        if (!segment) return car;
        
        // Calculate speed
        const targetSpeed = calculateSpeed(car, segment);
        const acceleration = (targetSpeed - car.speed) / 2.0; // 2 seconds to reach target speed
        const newSpeed = Math.max(0, car.speed + acceleration * deltaTime);
        
        // Calculate distance traveled
        const distanceTraveled = newSpeed * (deltaTime / 3.6); // Convert km/h to m/s
        const newSegmentProgress = car.segmentProgress + (distanceTraveled / segment.length);
        
        let newCar = { ...car };
        newCar.speed = newSpeed;
        newCar.acceleration = acceleration;
        
        // Check for segment transition
        if (newSegmentProgress >= 1.0) {
          // Move to next segment
          const nextSegmentIndex = (car.currentSegment + 1) % trackData.segments.length;
          const nextSegment = trackData.segments[nextSegmentIndex];
          
          if (nextSegmentIndex === 0) {
            // Completed a lap
            newCar.laps += 1;
            if (newCar.lapTimes.length > 0) {
              newCar.lapTimes.push(raceTime - newCar.currentTime);
              newCar.currentTime = raceTime;
            }
          }
          
          newCar.currentSegment = nextSegmentIndex;
          newCar.segmentProgress = newSegmentProgress - 1.0;
          newCar.position = { 
            x: nextSegment.startX, 
            y: nextSegment.startY 
          };
        } else {
          newCar.segmentProgress = newSegmentProgress;
          // Interpolate position
          const t = newSegmentProgress;
          newCar.position = {
            x: segment.startX + (segment.endX - segment.startX) * t,
            y: segment.startY + (segment.endY - segment.startY) * t
          };
        }
        
        // Update tire wear
        const tireWearRate = 0.0001 * (1 + car.strategy.aggression * 0.5) * 
                            (segment.type === 'corner' ? 1.5 : 1.0);
        newCar.tireWear = Math.min(1.0, car.tireWear + tireWearRate * distanceTraveled);
        
        // Update fuel consumption
        const fuelConsumptionRate = 0.00005 * (1 + car.strategy.aggression * 0.3);
        newCar.fuel = Math.max(0, car.fuel - fuelConsumptionRate * distanceTraveled);
        
        // Update battery/ERS
        const batteryConsumption = 0.00002 * distanceTraveled;
        newCar.battery = Math.max(0, car.battery - batteryConsumption);
        
        // Check for pit stop requirements
        if (newCar.tireWear > 0.8 || newCar.fuel < 0.15) {
          const pitEntrySegment = trackData.pitLaneEntry;
          const pitExitSegment = trackData.pitLaneExit;
          
          if (car.currentSegment === pitEntrySegment && !car.isInPit) {
            newCar.isInPit = true;
            newCar.pitStopTime = 3.0; // 3 second pit stop
          }
        }
        
        // Update total distance
        newCar.distance = car.distance + distanceTraveled;
        
        // Calculate angle for rendering
        if (segment.endX !== segment.startX || segment.endY !== segment.startY) {
          newCar.angle = Math.atan2(
            segment.endY - segment.startY,
            segment.endX - segment.startX
          );
        }
        
        return newCar;
      });
    });
  }, [trackData, calculateSpeed, raceTime]);

  // Check for overtakes
  const checkOvertakes = useCallback(() => {
    setRaceCars(prevCars => {
      const sortedCars = [...prevCars].sort((a, b) => {
        if (a.laps !== b.laps) return b.laps - a.laps;
        return b.distance - a.distance;
      });
      
      return sortedCars.map((car, index) => {
        const currentPosition = index + 1;
        const previousPosition = prevCars.findIndex(c => c.id === car.id) + 1;
        
        if (previousPosition > 0 && previousPosition !== currentPosition) {
          if (previousPosition > currentPosition) {
            return { ...car, overtakes: car.overtakes + (previousPosition - currentPosition) };
          } else {
            return { ...car, positionsLost: car.positionsLost + (currentPosition - previousPosition) };
          }
        }
        return car;
      });
    });
  }, []);

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
    }

    const deltaTime = (timestamp - lastTimeRef.current) / 1000 * speedMultiplier;
    lastTimeRef.current = timestamp;

    if (raceState === 'running') {
      setRaceTime(prev => prev + deltaTime);
      updateRaceCars(deltaTime);
      
      // Check for overtakes every 100ms
      if (Math.floor(timestamp / 100) % 10 === 0) {
        checkOvertakes();
      }
      
      // Check for race finish
      const leadingCar = raceCars.reduce((prev, current) => 
        current.laps > prev.laps || (current.laps === prev.laps && current.distance > prev.distance) 
          ? current : prev, raceCars[0]
      );
      
      if (leadingCar && leadingCar.laps >= totalLaps) {
        setRaceState('finished');
        setTimeout(() => generateRaceResults(), 100);
      }
    }

    render();
    animationRef.current = requestAnimationFrame(animate);
  }, [raceState, speedMultiplier, updateRaceCars, checkOvertakes, raceCars, totalLaps]);

  // Render track and cars
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !trackData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw track segments
    trackData.segments.forEach(segment => {
      ctx.strokeStyle = segment.gripLevel > 0.7 ? '#444' : '#333';
      ctx.lineWidth = 60;
      ctx.beginPath();
      ctx.moveTo(segment.startX, segment.startY);
      ctx.lineTo(segment.endX, segment.endY);
      ctx.stroke();

      // Draw DRS zones
      if (segment.drsZone) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(segment.startX, segment.startY);
        ctx.lineTo(segment.endX, segment.endY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Draw obstacles
    trackData.obstacles.forEach(obstacle => {
      const segment = trackData.segments[obstacle.segmentId];
      if (!segment) return;
      
      const x = segment.startX + (segment.endX - segment.startX) * obstacle.position;
      const y = segment.startY + (segment.endY - segment.startY) * obstacle.position;
      
      ctx.fillStyle = obstacle.type === 'barrier' ? '#ff0000' : 
                     obstacle.type === 'debris' ? '#ff8800' : '#ffff00';
      ctx.fillRect(x - 5, y - 5, 10, 10);
    });

    // Draw cars
    raceCars.forEach(car => {
      if (car.isInPit) return;

      ctx.save();
      ctx.translate(car.position.x, car.position.y);
      ctx.rotate(car.angle);

      // Car body
      ctx.fillStyle = car.color;
      ctx.fillRect(-8, -4, 16, 8);
      
      // Car outline
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(-8, -4, 16, 8);
      
      // Highlighted if selected
      if (selectedCarId === car.id) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      // Car name
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(car.name, car.position.x, car.position.y - 15);
    });
  }, [trackData, raceCars, selectedCarId]);

  // Start animation loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  // Generate race results
  const generateRaceResults = useCallback(() => {
    if (!driverData) return;
    
    const sortedCars = [...raceCars].sort((a, b) => {
      if (a.laps !== b.laps) return b.laps - a.laps;
      return b.distance - a.distance;
    });

    const winner = driverData.drivers.find(d => d.id === sortedCars[0].driverId)!;
    
    const finalStandings = sortedCars.map((car, index) => {
      const driver = driverData.drivers.find(d => d.id === car.driverId)!;
      return {
        driver,
        position: index + 1,
        laps: car.laps,
        totalTime: car.currentTime,
        fastestLap: Math.min(...car.lapTimes) || 0,
        overtakes: car.overtakes,
        hazardsTriggered: car.hazardsTriggered,
        tireWear: car.tireWear,
        fuelRemaining: car.fuel
      };
    });

    const lapTimes = sortedCars.flatMap(car => 
      car.lapTimes.map((time, lapIndex) => ({
        driver: driverData.drivers.find(d => d.id === car.driverId)!,
        lap: lapIndex + 1,
        time
      }))
    );

    setRaceResults({
      winner,
      finalStandings,
      lapTimes
    });
  }, [raceCars, driverData]);

  // Control handlers
  const handleStart = () => {
    setRaceState('running');
    lastTimeRef.current = 0;
  };

  const handlePause = () => {
    setRaceState('paused');
  };

  const handleReset = () => {
    setRaceState('stopped');
    setRaceTime(0);
    setSelectedCarId(null);
    setRaceResults(null);
    if (driverData && trackData) {
      initializeRaceCars(driverData.drivers, trackData);
    }
    lastTimeRef.current = 0;
  };

  const handleSpeedChange = (multiplier: number) => {
    setSpeedMultiplier(multiplier);
  };

  const handleCarSelect = (carId: number) => {
    setSelectedCarId(prev => prev === carId ? null : carId);
  };

  const handlePromptSubmit = (prompt: string) => {
    console.log('Prompt submitted:', prompt);
    
    // Handle track generation request
    if (prompt.toLowerCase().includes('generate track') || prompt.toLowerCase().includes('create track')) {
      generateTrackJSON();
      return;
    }
    
    // Handle other AI commands
    // TODO: Implement AI prompt handling logic
  };

  // Generate track JSON
  const generateTrackJSON = useCallback(() => {
    const segments: TrackSegment[] = [];
    const obstacles: Obstacle[] = [];
    const hazards: Hazard[] = [];
    
    // Generate a simple oval track
    const numSegments = 20;
    const centerX = 400;
    const centerY = 300;
    const radiusX = 350;
    const radiusY = 200;
    
    for (let i = 0; i < numSegments; i++) {
      const angle1 = (i / numSegments) * Math.PI * 2;
      const angle2 = ((i + 1) / numSegments) * Math.PI * 2;
      
      const x1 = centerX + Math.cos(angle1) * radiusX;
      const y1 = centerY + Math.sin(angle1) * radiusY;
      const x2 = centerX + Math.cos(angle2) * radiusX;
      const y2 = centerY + Math.sin(angle2) * radiusY;
      
      const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const isCorner = i % 5 === 0;
      
      segments.push({
        id: i + 1,
        startX: x1,
        startY: y1,
        endX: x2,
        endY: y2,
        length,
        type: isCorner ? 'corner' : 'straight',
        gripLevel: 0.6 + Math.random() * 0.4,
        drsZone: !isCorner && Math.random() > 0.7,
        ...(isCorner && {
          cornerRadius: 50 + Math.random() * 100,
          cornerDirection: Math.random() > 0.5 ? 'left' : 'right'
        })
      });
    }
    
    // Add some random obstacles and hazards
    for (let i = 0; i < 5; i++) {
      obstacles.push({
        id: i + 1,
        segmentId: Math.floor(Math.random() * numSegments) + 1,
        position: Math.random(),
        type: ['barrier', 'debris', 'oil'][Math.floor(Math.random() * 3)] as any,
        severity: 0.3 + Math.random() * 0.7
      });
    }
    
    for (let i = 0; i < 3; i++) {
      hazards.push({
        id: i + 1,
        segmentId: Math.floor(Math.random() * numSegments) + 1,
        position: Math.random(),
        type: ['rain', 'wind', 'temperature'][Math.floor(Math.random() * 3)] as any,
        intensity: 0.2 + Math.random() * 0.6,
        duration: 5 + Math.random() * 20
      });
    }
    
    const newTrack: TrackJSON = {
      name: 'Generated Circuit',
      totalLength: segments.reduce((sum, seg) => sum + seg.length, 0),
      segments,
      obstacles,
      hazards,
      pitLaneEntry: Math.floor(numSegments * 0.7),
      pitLaneExit: Math.floor(numSegments * 0.8)
    };
    
    setTrackData(newTrack);
    console.log('Generated track:', newTrack);
  }, []);

  const selectedCar = raceCars.find(c => c.id === selectedCarId);

  return (
    <div className="space-y-4">
      <TrackSelector onTrackSelect={setSelectedTrack} selectedTrack={selectedTrack} />
      
      <PromptInput onPromptSubmit={handlePromptSubmit} />
      
      <RaceControls
        raceState={{ status: raceState, speedMultiplier, selectedCarId, weather: { type: 'clear', intensity: 0 } }}
        onStart={handleStart}
        onPause={handlePause}
        onReset={handleReset}
        onSpeedChange={handleSpeedChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="p-4 bg-card/50 backdrop-blur-sm">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="w-full h-auto border border-border rounded-lg"
            />
          </Card>
          
          {/* Race Results */}
          {raceResults && (
            <Card className="p-4 bg-card/50 backdrop-blur-sm mt-4">
              <h3 className="text-lg font-bold mb-2">Race Results</h3>
              <div className="space-y-2">
                <div className="text-yellow-400 font-bold">
                  🏆 Winner: {raceResults.winner.name}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {raceResults.finalStandings.slice(0, 10).map((standing) => (
                    <div key={standing.driver.id} className="flex justify-between text-sm">
                      <span className={standing.position <= 3 ? 'font-bold' : ''}>
                        {standing.position}. {standing.driver.name}
                      </span>
                      <span>{standing.laps} laps</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <WeatherIndicator weather={{ type: 'clear', intensity: 0 }} />
          <Leaderboard
            cars={raceCars.map(car => ({
              id: car.id,
              name: car.name,
              color: car.color,
              position: car.position,
              speed: car.speed,
              acceleration: car.acceleration,
              battery: car.battery,
              distance: car.distance,
              laps: car.laps,
              isInPit: car.isInPit,
              pitStopTime: car.pitStopTime,
              angle: car.angle,
              maxSpeed: car.maxSpeed,
              energyConsumption: car.energyConsumption
            }))}
            onCarSelect={handleCarSelect}
            selectedCarId={selectedCarId}
          />
          <Telemetry car={selectedCar ? {
            id: selectedCar.id,
            name: selectedCar.name,
            color: selectedCar.color,
            position: selectedCar.position,
            speed: selectedCar.speed,
            acceleration: selectedCar.acceleration,
            battery: selectedCar.battery,
            distance: selectedCar.distance,
            laps: selectedCar.laps,
            isInPit: selectedCar.isInPit,
            pitStopTime: selectedCar.pitStopTime,
            angle: selectedCar.angle,
            maxSpeed: selectedCar.maxSpeed,
            energyConsumption: selectedCar.energyConsumption
          } : null} />
        </div>
      </div>
    </div>
  );
}
