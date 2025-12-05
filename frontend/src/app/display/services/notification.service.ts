import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Notification type for overlay display
 */
export type NotificationType = 'six' | 'four' | 'wicket' | 'third-umpire' | 'custom-message' | null;

/**
 * Third umpire decision type
 */
export type ThirdUmpireDecision = 'out' | 'not-out' | null;

/**
 * Notification data for display overlays
 */
export interface NotificationData {
  // For six/four
  batsmanName?: string;
  batsmanImage?: string;
  batsmanRuns?: number;
  batsmanBalls?: number;
  totalScore?: number;
  totalWickets?: number;
  
  // For wicket
  dismissedName?: string;
  dismissedImage?: string;
  dismissedRuns?: number;
  dismissedBalls?: number;
  dismissalType?: string;
  bowlerName?: string;
  fielderName?: string;
}

/**
 * Complete notification state
 */
export interface NotificationState {
  showNotification: boolean;
  notificationType: NotificationType;
  notificationData: NotificationData | null;
  thirdUmpireDecision: ThirdUmpireDecision;
  customMessage: string;
}

/**
 * Service to manage notification overlays for the display UI.
 * Handles six, four, wicket, third umpire, and custom message notifications.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  
  // Configuration
  private notificationDuration = 10000; // 10 seconds default
  private notificationTimeout: any = null;
  
  // State management
  private stateSubject = new BehaviorSubject<NotificationState>({
    showNotification: false,
    notificationType: null,
    notificationData: null,
    thirdUmpireDecision: null,
    customMessage: ''
  });
  
  public state$: Observable<NotificationState> = this.stateSubject.asObservable();

  constructor() {}

  /**
   * Get current notification state synchronously
   */
  getCurrentState(): NotificationState {
    return this.stateSubject.getValue();
  }

  /**
   * Set notification duration (in milliseconds)
   */
  setNotificationDuration(duration: number): void {
    this.notificationDuration = duration;
  }

  /**
   * Get notification duration
   */
  getNotificationDuration(): number {
    return this.notificationDuration;
  }

  /**
   * Show a big notification overlay (six, four, or wicket)
   */
  showBigNotification(type: 'six' | 'four' | 'wicket', data: NotificationData): void {
    // Clear any existing notification timeout
    this.clearTimeout();
    
    const state: NotificationState = {
      showNotification: true,
      notificationType: type,
      notificationData: data,
      thirdUmpireDecision: null,
      customMessage: ''
    };
    
    this.stateSubject.next(state);
    
    // Auto-dismiss after configured duration
    this.notificationTimeout = setTimeout(() => {
      this.dismiss();
    }, this.notificationDuration);
  }

  /**
   * Show third umpire review overlay (pending decision)
   */
  showThirdUmpireOverlay(): void {
    // Clear any existing notification
    this.clearTimeout();
    
    const state: NotificationState = {
      showNotification: true,
      notificationType: 'third-umpire',
      notificationData: null,
      thirdUmpireDecision: null,
      customMessage: ''
    };
    
    this.stateSubject.next(state);
    // No auto-dismiss for pending decision - admin controls when to show decision
  }

  /**
   * Show third umpire decision (out or not-out)
   * @param decision The umpire's decision
   * @param dismissedPlayerData Optional data about the dismissed player (for 'out' decisions)
   */
  showThirdUmpireDecision(decision: 'out' | 'not-out', dismissedPlayerData?: NotificationData): void {
    const currentState = this.getCurrentState();
    
    const state: NotificationState = {
      ...currentState,
      thirdUmpireDecision: decision,
      notificationData: dismissedPlayerData || currentState.notificationData
    };
    
    this.stateSubject.next(state);
    
    // Auto-dismiss after showing decision
    this.notificationTimeout = setTimeout(() => {
      this.dismiss();
    }, this.notificationDuration);
  }

  /**
   * Show custom message overlay
   */
  showCustomMessage(message: string): void {
    // Clear any existing notification
    this.clearTimeout();
    
    const state: NotificationState = {
      showNotification: true,
      notificationType: 'custom-message',
      notificationData: null,
      thirdUmpireDecision: null,
      customMessage: message
    };
    
    this.stateSubject.next(state);
    // Custom messages don't auto-dismiss - admin controls when to dismiss
  }

  /**
   * Dismiss the current notification
   */
  dismiss(): void {
    this.clearTimeout();
    
    const state: NotificationState = {
      showNotification: false,
      notificationType: null,
      notificationData: null,
      thirdUmpireDecision: null,
      customMessage: ''
    };
    
    this.stateSubject.next(state);
  }

  /**
   * Check if a notification is currently showing
   */
  isShowing(): boolean {
    return this.getCurrentState().showNotification;
  }

  /**
   * Get current notification type
   */
  getType(): NotificationType {
    return this.getCurrentState().notificationType;
  }

  /**
   * Check if notification can be dismissed by user click
   * Third umpire pending decisions cannot be dismissed by click
   */
  canDismiss(): boolean {
    const state = this.getCurrentState();
    if (state.notificationType === 'third-umpire' && !state.thirdUmpireDecision) {
      return false;
    }
    return true;
  }

  /**
   * Clear the auto-dismiss timeout
   */
  private clearTimeout(): void {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }
  }

  /**
   * Clean up on destroy
   */
  destroy(): void {
    this.clearTimeout();
  }
}
