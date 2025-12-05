import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, Observable } from 'rxjs';

/**
 * SSE Event types that can be emitted
 */
export type SSEEventType = 
  | 'connected'
  | 'connection-lost'
  | 'reconnecting'
  | 'sync-required'
  | 'heartbeat'
  | 'score-update'
  | 'over-complete'
  | 'innings-complete'
  | 'innings-start'
  | 'match-complete'
  | 'batsmen-change'
  | 'bowler-change'
  | 'background-change'
  | 'squad-change'
  | 'zoom-change'
  | 'six'
  | 'four'
  | 'wicket'
  | 'third-umpire-start'
  | 'third-umpire-decision'
  | 'custom-message'
  | 'custom-message-dismiss'
  | 'view-change'
  | 'match-state';

/**
 * SSE Event structure
 */
export interface SSEEvent {
  type: SSEEventType;
  data?: any;
}

/**
 * Connection state
 */
export interface ConnectionState {
  isConnected: boolean;
  reconnectAttempts: number;
  lastHeartbeat: number;
}

/**
 * Service to manage SSE connections for match display
 * Handles connection, reconnection, heartbeat monitoring, and sync verification
 */
@Injectable({
  providedIn: 'root'
})
export class MatchDisplaySSEService implements OnDestroy {
  // Configuration
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly SYNC_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT = 60000; // 60 seconds
  private readonly HEARTBEAT_CHECK_INTERVAL = 45000; // 45 seconds

  // Connection state
  private eventSource: EventSource | null = null;
  private matchId: string | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private lastHeartbeat = 0;

  // Version tracking for sync
  private serverVersion = 0;
  private lastKnownVersion = 0;

  // Timers
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatCheckInterval: ReturnType<typeof setInterval> | null = null;
  private syncCheckInterval: ReturnType<typeof setInterval> | null = null;

  // Observables
  private eventsSubject = new Subject<SSEEvent>();
  private connectionStateSubject = new Subject<ConnectionState>();
  
  public events$: Observable<SSEEvent> = this.eventsSubject.asObservable();
  public connectionState$: Observable<ConnectionState> = this.connectionStateSubject.asObservable();

  constructor(private http: HttpClient) {}

  ngOnDestroy(): void {
    this.disconnect();
  }

  /**
   * Connect to SSE for a specific match
   */
  connect(matchId: string): void {
    // Clean up any existing connection
    this.disconnect();
    
    this.matchId = matchId;
    console.log('SSE: Connecting to live updates...');
    
    this.eventSource = new EventSource(`/api/matches/${matchId}/live`);
    
    // Connection opened successfully
    this.eventSource.addEventListener('connected', (event: any) => {
      console.log('SSE: Connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.lastHeartbeat = Date.now();
      
      // Extract version from connected event if available
      try {
        const data = JSON.parse(event.data);
        if (data.version !== undefined) {
          this.serverVersion = data.version;
          this.lastKnownVersion = data.version;
        }
      } catch (e) { /* ignore parse errors */ }
      
      this.startHeartbeatCheck();
      this.startSyncCheck();
      
      this.emitConnectionState();
      this.eventsSubject.next({ type: 'connected' });
    });
    
    // Handle heartbeat to track connection health and version
    this.eventSource.addEventListener('heartbeat', (event: any) => {
      this.lastHeartbeat = Date.now();
      this.isConnected = true;
      
      // Extract version from heartbeat if available
      try {
        const data = JSON.parse(event.data);
        if (data.version !== undefined) {
          this.serverVersion = data.version;
        }
      } catch (e) { /* ignore parse errors */ }
      
      this.eventsSubject.next({ type: 'heartbeat' });
    });
    
    // Standard events that just need to be forwarded
    const standardEvents: SSEEventType[] = [
      'score-update', 'over-complete', 'innings-complete',
      'innings-start', 'match-complete', 'batsmen-change', 
      'bowler-change', 'background-change', 'squad-change', 'zoom-change'
    ];
    
    standardEvents.forEach(eventName => {
      this.eventSource!.addEventListener(eventName, (event: any) => {
        this.lastHeartbeat = Date.now();
        this.extractVersion(event);
        this.eventsSubject.next({ type: eventName });
      });
    });
    
    // Special notification events with data
    this.eventSource.addEventListener('six', (event: any) => {
      this.lastHeartbeat = Date.now();
      const data = this.parseEventData(event);
      this.eventsSubject.next({ type: 'six', data });
    });
    
    this.eventSource.addEventListener('four', (event: any) => {
      this.lastHeartbeat = Date.now();
      const data = this.parseEventData(event);
      this.eventsSubject.next({ type: 'four', data });
    });
    
    this.eventSource.addEventListener('wicket', (event: any) => {
      this.lastHeartbeat = Date.now();
      const data = this.parseEventData(event);
      this.eventsSubject.next({ type: 'wicket', data });
    });
    
    // Third Umpire events
    this.eventSource.addEventListener('third-umpire-start', (event: any) => {
      this.lastHeartbeat = Date.now();
      this.extractVersion(event);
      this.eventsSubject.next({ type: 'third-umpire-start' });
    });
    
    this.eventSource.addEventListener('third-umpire-decision', (event: any) => {
      this.lastHeartbeat = Date.now();
      const data = this.parseEventData(event);
      this.eventsSubject.next({ type: 'third-umpire-decision', data });
    });
    
    // Custom message events
    this.eventSource.addEventListener('custom-message', (event: any) => {
      this.lastHeartbeat = Date.now();
      const data = this.parseEventData(event);
      this.eventsSubject.next({ type: 'custom-message', data });
    });
    
    this.eventSource.addEventListener('custom-message-dismiss', (event: any) => {
      this.lastHeartbeat = Date.now();
      this.extractVersion(event);
      this.eventsSubject.next({ type: 'custom-message-dismiss' });
    });
    
    // View change events
    this.eventSource.addEventListener('view-change', (event: any) => {
      this.lastHeartbeat = Date.now();
      const data = this.parseEventData(event);
      this.eventsSubject.next({ type: 'view-change', data });
    });
    
    this.eventSource.addEventListener('match-state', (event: any) => {
      this.lastHeartbeat = Date.now();
      const data = this.parseEventData(event);
      this.eventsSubject.next({ type: 'match-state', data });
    });
    
    // Handle connection errors with exponential backoff
    this.eventSource.onerror = (error) => {
      console.error('SSE: Connection error', error);
      this.isConnected = false;
      this.emitConnectionState();
      this.eventsSubject.next({ type: 'connection-lost' });
      this.closeConnection();
      this.scheduleReconnect();
    };
  }

  /**
   * Disconnect from SSE
   */
  disconnect(): void {
    this.stopHeartbeatCheck();
    this.stopSyncCheck();
    this.clearReconnectTimeout();
    this.closeConnection();
    this.matchId = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Force a sync check
   */
  forceSync(): void {
    this.checkSync();
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat
    };
  }

  // ==================== PRIVATE METHODS ====================

  private parseEventData(event: any): any {
    try {
      const data = JSON.parse(event.data);
      if (data._version !== undefined) {
        this.serverVersion = data._version;
      }
      return data;
    } catch (e) {
      return {};
    }
  }

  private extractVersion(event: any): void {
    try {
      const data = JSON.parse(event.data);
      if (data._version !== undefined) {
        this.serverVersion = data._version;
      }
    } catch (e) { /* ignore */ }
  }

  private emitConnectionState(): void {
    this.connectionStateSubject.next(this.getConnectionState());
  }

  private closeConnection(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private startSyncCheck(): void {
    this.stopSyncCheck();
    
    // Periodic sync verification to catch missed updates
    this.syncCheckInterval = setInterval(() => {
      this.checkSync();
    }, this.SYNC_CHECK_INTERVAL);
  }

  private stopSyncCheck(): void {
    if (this.syncCheckInterval) {
      clearInterval(this.syncCheckInterval);
      this.syncCheckInterval = null;
    }
  }

  private checkSync(): void {
    if (!this.matchId) return;
    
    this.http.get<{ success: boolean; data: any }>(`/api/matches/${this.matchId}/sync-check`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const serverVersion = response.data.version;
          
          // If server version is higher than our last known version, we missed updates
          if (serverVersion > this.lastKnownVersion) {
            console.log(`Sync: Version mismatch detected (server: ${serverVersion}, local: ${this.lastKnownVersion}). Triggering reload...`);
            this.eventsSubject.next({ 
              type: 'sync-required', 
              data: { displayView: response.data.displayView }
            });
          }
          
          // Update our tracking
          this.lastKnownVersion = serverVersion;
          this.serverVersion = serverVersion;
          
          // Also check if displayView changed
          if (response.data.displayView) {
            // Let the component handle view comparison
            this.eventsSubject.next({ 
              type: 'sync-required', 
              data: { displayView: response.data.displayView }
            });
          }
        }
      },
      error: (err) => {
        console.warn('Sync check failed:', err.message);
        // On sync check failure, trigger reload to be safe
        this.eventsSubject.next({ type: 'sync-required' });
      }
    });
  }

  private startHeartbeatCheck(): void {
    this.stopHeartbeatCheck();
    
    // Check every 45 seconds if we've received a heartbeat (server sends every 30s)
    this.heartbeatCheckInterval = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      
      // If no heartbeat for 60 seconds, connection is likely dead
      if (timeSinceLastHeartbeat > this.HEARTBEAT_TIMEOUT) {
        console.warn('SSE: No heartbeat received, reconnecting...');
        this.isConnected = false;
        this.emitConnectionState();
        this.eventsSubject.next({ type: 'connection-lost' });
        this.closeConnection();
        this.scheduleReconnect();
      }
    }, this.HEARTBEAT_CHECK_INTERVAL);
  }

  private stopHeartbeatCheck(): void {
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
      this.heartbeatCheckInterval = null;
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimeout();
    
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('SSE: Max reconnect attempts reached');
      return;
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    console.log(`SSE: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
    
    this.eventsSubject.next({ type: 'reconnecting' });
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.matchId) {
        // Emit sync-required to reload match data first
        this.eventsSubject.next({ type: 'sync-required' });
        this.connect(this.matchId);
      }
    }, delay);
  }
}
