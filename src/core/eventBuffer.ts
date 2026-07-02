import { broadcastEvent } from './livewire';

export type StreamEvent = {
  id: string;
  timestamp: string;
  message: string;
  level?: string;
  service?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

class EventBuffer {
  private events: StreamEvent[] = [];
  private capacity: number = 1000; // Maximum number of events held in memory

  constructor() {
    this.events = [];
  }

  // Append a new event to the buffer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  push(raw: any): StreamEvent {
    // Ensure the event carries a message property
    const message = raw.message || raw.msg || JSON.stringify(raw);

    const event: StreamEvent = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      message,
      ...raw,
    };

    // Newest-first ordering
    this.events.unshift(event);

    // Drop overflow beyond capacity
    if (this.events.length > this.capacity) {
      this.events = this.events.slice(0, this.capacity);
    }

    // Fan the event out to connected clients
    broadcastEvent(event);

    return event;
  }

  // All buffered events
  all(): StreamEvent[] {
    return this.events;
  }

  // Empty the buffer
  reset(): void {
    this.events = [];
    broadcastEvent({ type: 'clear' });
  }

  // Free-text lookup across message, service and level
  find(query: string): StreamEvent[] {
    if (!query) return this.events;

    const needle = query.toLowerCase();
    return this.events.filter(
      (event) =>
        event.message.toLowerCase().includes(needle) ||
        (event.service && event.service.toLowerCase().includes(needle)) ||
        (event.level && event.level.toLowerCase().includes(needle)),
    );
  }

  // Restrict to a single severity level
  byLevel(level: string): StreamEvent[] {
    if (!level) return this.events;

    return this.events.filter(
      (event) =>
        event.level && event.level.toLowerCase() === level.toLowerCase(),
    );
  }

  // Restrict to a single service
  byService(service: string): StreamEvent[] {
    if (!service) return this.events;

    return this.events.filter(
      (event) =>
        event.service &&
        event.service.toLowerCase() === service.toLowerCase(),
    );
  }
}

// Shared singleton buffer
const eventBuffer = new EventBuffer();

export default eventBuffer;
