export enum EventType {
  WEATHER_CHANGE = 'WEATHER_CHANGE',
  BREAKDOWN = 'BREAKDOWN', 
  OBSTACLE_APPEAR = 'OBSTACLE_APPEAR',
  OVERTAKE_ATTEMPT = 'OVERTAKE_ATTEMPT',
  BATTERY_LOW = 'BATTERY_LOW',
  PIT_STOP = 'PIT_STOP',
  COLLISION = 'COLLISION'
}

export interface SimulationEvent {
  id: string;
  type: EventType;
  timestamp: number;
  data: any;
  targetVehicleId?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export type EventCallback = (event: SimulationEvent) => void;

export class EventManager {
  private eventQueue: SimulationEvent[] = [];
  private subscribers: Map<EventType, EventCallback[]> = new Map();
  private nextEventId = 0;
  private processingEvents = false;

  // Subscribe to specific event types
  public subscribe(eventType: EventType, callback: EventCallback): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    
    const callbacks = this.subscribers.get(eventType)!;
    callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  // Emit a new event to the queue
  public emit(eventType: EventType, data: any, options: {
    targetVehicleId?: number;
    priority?: SimulationEvent['priority'];
    delay?: number;
  } = {}): void {
    const event: SimulationEvent = {
      id: `event_${this.nextEventId++}`,
      type: eventType,
      timestamp: Date.now() + (options.delay || 0),
      data,
      targetVehicleId: options.targetVehicleId,
      priority: options.priority || 'medium'
    };

    this.eventQueue.push(event);
    this.sortEventQueue();
  }

  // Process all events in the queue
  public process(): void {
    if (this.processingEvents) return;
    
    this.processingEvents = true;
    
    try {
      const now = Date.now();
      const readyEvents = this.eventQueue.filter(event => event.timestamp <= now);
      
      // Process events in priority order
      readyEvents.forEach(event => {
        this.dispatchEvent(event);
        this.removeFromQueue(event.id);
      });
    } finally {
      this.processingEvents = false;
    }
  }

  // Dispatch event to subscribers
  private dispatchEvent(event: SimulationEvent): void {
    const callbacks = this.subscribers.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error processing event ${event.id}:`, error);
        }
      });
    }
  }

  // Sort event queue by priority and timestamp
  private sortEventQueue(): void {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    this.eventQueue.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return a.timestamp - b.timestamp;
    });
  }

  // Remove event from queue
  private removeFromQueue(eventId: string): void {
    const index = this.eventQueue.findIndex(event => event.id === eventId);
    if (index > -1) {
      this.eventQueue.splice(index, 1);
    }
  }

  // Get queued events count
  public getQueueCount(): number {
    return this.eventQueue.length;
  }

  // Clear all events
  public clear(): void {
    this.eventQueue = [];
  }

  // Get events for specific vehicle
  public getEventsForVehicle(vehicleId: number): SimulationEvent[] {
    return this.eventQueue.filter(event => 
      event.targetVehicleId === undefined || event.targetVehicleId === vehicleId
    );
  }

  // Helper methods for common events
  public emitWeatherChange(weather: { type: string; intensity: number }): void {
    this.emit(EventType.WEATHER_CHANGE, weather, { priority: 'high' });
  }

  public emitBreakdown(vehicleId: number, severity: number): void {
    this.emit(EventType.BREAKDOWN, { severity }, { 
      targetVehicleId: vehicleId, 
      priority: 'critical' 
    });
  }

  public emitObstacleAppear(segmentId: number, obstacleType: string): void {
    this.emit(EventType.OBSTACLE_APPEAR, { segmentId, obstacleType }, { priority: 'medium' });
  }

  public emitOvertakeAttempt(attackerId: number, defenderId: number): void {
    this.emit(EventType.OVERTAKE_ATTEMPT, { attackerId, defenderId }, { 
      targetVehicleId: attackerId,
      priority: 'high' 
    });
  }

  public emitBatteryLow(vehicleId: number, level: number): void {
    this.emit(EventType.BATTERY_LOW, { level }, { 
      targetVehicleId: vehicleId, 
      priority: 'medium' 
    });
  }

  public emitPitStop(vehicleId: number, reason: string): void {
    this.emit(EventType.PIT_STOP, { reason }, { 
      targetVehicleId: vehicleId, 
      priority: 'medium' 
    });
  }

  public emitCollision(vehicle1Id: number, vehicle2Id: number, severity: number): void {
    this.emit(EventType.COLLISION, { vehicle2Id, severity }, { 
      targetVehicleId: vehicle1Id, 
      priority: 'critical' 
    });
  }
}
