"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { Car, Weather, RaceState, TrackPoint } from '@/types/race';
import Leaderboard from './Leaderboard';
import Telemetry from './Telemetry';
import WeatherIndicator from './WeatherIndicator';
import RaceControls from './RaceControls';
import { Card } from '@/components/ui/card';

const TRACK_LENGTH = 2400; // Track perimeter in meters
const LAP_THRESHOLD = 100; // Distance threshold to complete a lap
const PIT_STOP_DURATION = 3; // Seconds
const BATTERY_RECHARGE_RATE = 15; // % per second during pit stop

export default function FormulaERace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const [cars, setCars] = useState<Car[]>([]);
  const [raceState, setRaceState] = useState<RaceState>({
    status: 'stopped',
    speedMultiplier: 1,
    selectedCarId: null,
    weather: { type: 'clear', intensity: 0 },
  });
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);

  // Initialize track (oval shape)
  useEffect(() => {
    const points: TrackPoint[] = [];
    const centerX = 400;
    const centerY = 300;
    const radiusX = 300;
    const radiusY = 200;
    
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      points.push({
        x: centerX + Math.cos(angle) * radiusX,
        y: centerY + Math.sin(angle) * radiusY,
      });
    }
    setTrackPoints(points);
  }, []);

  // Initialize cars
  const initializeCars = useCallback(() => {
    const carConfigs = [
      { name: 'Car #1', color: '#3b82f6' },
      { name: 'Car #2', color: '#ef4444' },
      { name: 'Car #3', color: '#10b981' },
      { name: 'Car #4', color: '#f59e0b' },
      { name: 'Car #5', color: '#8b5cf6' },
      { name: 'Car #6', color: '#ec4899' },
    ];

    const newCars: Car[] = carConfigs.map((config, index) => ({
      id: index,
      name: config.name,
      color: config.color,
      position: { x: 0, y: 0 },
      speed: 0,
      acceleration: 5 + Math.random() * 3,
      battery: 100,
      distance: 0,
      laps: 0,
      isInPit: false,
      pitStopTime: 0,
      angle: 0,
      maxSpeed: 280 + Math.random() * 40,
      energyConsumption: 0.8 + Math.random() * 0.4,
    }));

    // Position cars at start
    if (trackPoints.length > 0) {
      newCars.forEach((car, idx) => {
        const startIndex = Math.floor(idx * 2);
        if (trackPoints[startIndex]) {
          car.position = { ...trackPoints[startIndex] };
          car.angle = 0;
        }
      });
    }

    setCars(newCars);
  }, [trackPoints]);

  useEffect(() => {
    if (trackPoints.length > 0 && cars.length === 0) {
      initializeCars();
    }
  }, [trackPoints, cars.length, initializeCars]);

  // Update weather randomly
  useEffect(() => {
    if (raceState.status !== 'running') return;

    const interval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance to change weather
        const weatherTypes: Weather['type'][] = ['clear', 'rain', 'wind'];
        const newType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        setRaceState(prev => ({
          ...prev,
          weather: {
            type: newType,
            intensity: newType === 'clear' ? 0 : 0.3 + Math.random() * 0.5,
            windDirection: newType === 'wind' ? Math.random() * Math.PI * 2 : undefined,
          },
        }));
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [raceState.status]);

  // Physics and race logic
  const updateCars = useCallback((deltaTime: number) => {
    if (raceState.status !== 'running' || trackPoints.length === 0) return;

    const dt = deltaTime * raceState.speedMultiplier;

    setCars(prevCars => prevCars.map(car => {
      let newCar = { ...car };

      // Pit stop logic
      if (newCar.isInPit) {
        newCar.pitStopTime += dt;
        newCar.battery = Math.min(100, newCar.battery + BATTERY_RECHARGE_RATE * dt);
        
        if (newCar.pitStopTime >= PIT_STOP_DURATION) {
          newCar.isInPit = false;
          newCar.pitStopTime = 0;
        }
        return newCar;
      }

      // Check if needs pit stop
      if (newCar.battery < 15 && !newCar.isInPit && Math.random() < 0.01) {
        newCar.isInPit = true;
        newCar.speed = 0;
        return newCar;
      }

      // Acceleration
      const targetSpeed = newCar.maxSpeed * (newCar.battery / 100);
      const weatherFactor = raceState.weather.type === 'rain' 
        ? (1 - raceState.weather.intensity * 0.3)
        : 1;
      
      const adjustedTargetSpeed = targetSpeed * weatherFactor;

      if (newCar.speed < adjustedTargetSpeed) {
        newCar.speed = Math.min(adjustedTargetSpeed, newCar.speed + newCar.acceleration * dt);
      } else {
        newCar.speed = Math.max(adjustedTargetSpeed, newCar.speed - newCar.acceleration * dt * 0.5);
      }

      // Calculate distance traveled
      const distanceDelta = (newCar.speed / 3.6) * dt; // Convert km/h to m/s
      newCar.distance += distanceDelta;

      // Energy consumption
      const baseConsumption = newCar.energyConsumption * (distanceDelta / 1000);
      const speedFactor = 1 + (newCar.speed / newCar.maxSpeed) * 0.5;
      const weatherEnergyFactor = raceState.weather.type === 'rain' ? 1.2 : 1;
      newCar.battery = Math.max(0, newCar.battery - baseConsumption * speedFactor * weatherEnergyFactor);

      // Update position on track
      const trackProgress = (newCar.distance % TRACK_LENGTH) / TRACK_LENGTH;
      const trackIndex = Math.floor(trackProgress * trackPoints.length);
      const nextIndex = (trackIndex + 1) % trackPoints.length;
      
      const currentPoint = trackPoints[trackIndex];
      const nextPoint = trackPoints[nextIndex];
      
      if (currentPoint && nextPoint) {
        const segmentProgress = (trackProgress * trackPoints.length) % 1;
        newCar.position = {
          x: currentPoint.x + (nextPoint.x - currentPoint.x) * segmentProgress,
          y: currentPoint.y + (nextPoint.y - currentPoint.y) * segmentProgress,
        };
        newCar.angle = Math.atan2(nextPoint.y - currentPoint.y, nextPoint.x - currentPoint.x);
      }

      // Lap counting
      const newLaps = Math.floor(newCar.distance / TRACK_LENGTH);
      if (newLaps > newCar.laps) {
        newCar.laps = newLaps;
      }

      // Wind effect
      if (raceState.weather.type === 'wind') {
        const windEffect = Math.sin(newCar.angle - (raceState.weather.windDirection || 0));
        newCar.speed *= (1 + windEffect * raceState.weather.intensity * 0.1);
      }

      return newCar;
    }));
  }, [raceState, trackPoints]);

  // Render
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw track
    if (trackPoints.length > 0) {
      // Outer edge
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 60;
      ctx.beginPath();
      trackPoints.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.stroke();

      // Inner track
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 50;
      ctx.stroke();

      // Track lines
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 20]);
      ctx.beginPath();
      trackPoints.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Start/finish line
      if (trackPoints[0]) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(trackPoints[0].x - 30, trackPoints[0].y);
        ctx.lineTo(trackPoints[0].x + 30, trackPoints[0].y);
        ctx.stroke();
      }
    }

    // Weather effects
    if (raceState.weather.type === 'rain') {
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 2, y + 10);
        ctx.stroke();
      }
    }

    // Draw cars
    cars.forEach(car => {
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
      if (raceState.selectedCarId === car.id) {
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
  }, [cars, trackPoints, raceState.weather, raceState.selectedCarId]);

  // Animation loop
  useEffect(() => {
    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (raceState.status === 'running') {
        updateCars(deltaTime);
      }

      render();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [raceState.status, updateCars, render]);

  const handleStart = () => {
    setRaceState(prev => ({ ...prev, status: 'running' }));
    lastTimeRef.current = 0;
  };

  const handlePause = () => {
    setRaceState(prev => ({ ...prev, status: 'paused' }));
  };

  const handleReset = () => {
    setRaceState(prev => ({ 
      ...prev, 
      status: 'stopped',
      selectedCarId: null,
      weather: { type: 'clear', intensity: 0 },
    }));
    initializeCars();
    lastTimeRef.current = 0;
  };

  const handleSpeedChange = (multiplier: number) => {
    setRaceState(prev => ({ ...prev, speedMultiplier: multiplier }));
  };

  const handleCarSelect = (carId: number) => {
    setRaceState(prev => ({
      ...prev,
      selectedCarId: prev.selectedCarId === carId ? null : carId,
    }));
  };

  const selectedCar = cars.find(c => c.id === raceState.selectedCarId) || null;

  return (
    <div className="space-y-4">
      <RaceControls
        raceState={raceState}
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
        </div>

        <div className="space-y-4">
          <WeatherIndicator weather={raceState.weather} />
          <Leaderboard
            cars={cars}
            onCarSelect={handleCarSelect}
            selectedCarId={raceState.selectedCarId}
          />
          <Telemetry car={selectedCar} />
        </div>
      </div>
    </div>
  );
}
