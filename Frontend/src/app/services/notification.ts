import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';


export interface Notification {
  _id: string;
  recipient: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
  };

  type:
    | 'CONNECTION_REQUEST'
    | 'CONNECTION_ACCEPTED'
    | 'CONNECTION_REJECTED'
    | 'APPOINTMENT_REQUEST'
    | 'APPOINTMENT_CONFIRMED'
    | 'APPOINTMENT_REJECTED'
    | 'APPOINTMENT_CANCELLED';

  message: string;
  isRead: boolean;

  relatedConnection?: {
    _id: string;
    status: 'pending' | 'accepted' | 'rejected';
  };

  relatedAppointment?: {
    _id: string;
    status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
    date?: string;
  };

  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  success: boolean;
  message?: string;
  notifications?: Notification[];
  notification?: Notification;
  unreadCount?: number;
}

export interface NotificationRealtimeEvent {
  eventName: string;
  data: any;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {

  private apiUrl = `${environment.apiUrl}/notifications`;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();
  private realtimeSubject = new Subject<NotificationRealtimeEvent>();
  public realtime$ = this.realtimeSubject.asObservable();
  private eventSource?: EventSource;

  constructor(private http: HttpClient) {
    this.requestBrowserNotificationPermission();
    this.connectRealtime();
  }

  startRealtime(): void {
    this.connectRealtime();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private connectRealtime(): void {
    const token = localStorage.getItem('token');
    if (!token || this.eventSource) {
      return;
    }

    const streamUrl = `${this.apiUrl}/stream?token=${encodeURIComponent(token)}`;
    this.eventSource = new EventSource(streamUrl);

    this.eventSource.addEventListener('connected', (event: MessageEvent) => {
      this.realtimeSubject.next({ eventName: 'connected', data: JSON.parse(event.data) });
    });

    this.eventSource.addEventListener('notification', (event: MessageEvent) => {
      const payload = JSON.parse(event.data);
      this.realtimeSubject.next({ eventName: 'notification', data: payload });
      this.showBrowserNotification(payload);
      this.refreshUnreadCount();
    });

    this.eventSource.addEventListener('notification-read', (event: MessageEvent) => {
      this.realtimeSubject.next({ eventName: 'notification-read', data: JSON.parse(event.data) });
      this.refreshUnreadCount();
    });

    this.eventSource.addEventListener('notification-deleted', (event: MessageEvent) => {
      this.realtimeSubject.next({ eventName: 'notification-deleted', data: JSON.parse(event.data) });
      this.refreshUnreadCount();
    });

    this.eventSource.onerror = () => {
      this.disconnectRealtime();
      setTimeout(() => this.connectRealtime(), 2000);
    };
  }

  getNotifications(): Observable<NotificationResponse> {
    this.connectRealtime();
    return this.http.get<NotificationResponse>(
      this.apiUrl,
      { headers: this.getHeaders() }
    );
  }

  getUnreadCount(): Observable<NotificationResponse> {
    this.connectRealtime();
    return this.http.get<NotificationResponse>(
      `${this.apiUrl}/unread-count`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        if (response.success && response.unreadCount !== undefined) {
          this.unreadCountSubject.next(response.unreadCount);
        }
      })
    );
  }

  markAsRead(notificationId: string): Observable<NotificationResponse> {
    return this.http.patch<NotificationResponse>(
      `${this.apiUrl}/${notificationId}/read`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        const currentCount = this.unreadCountSubject.value;
        if (currentCount > 0) {
          this.unreadCountSubject.next(currentCount - 1);
        }
      })
    );
  }

  deleteNotification(notificationId: string): Observable<NotificationResponse> {
    return this.http.delete<NotificationResponse>(
      `${this.apiUrl}/${notificationId}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        this.refreshUnreadCount();
      })
    );
  }

  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe();
  }

  disconnectRealtime(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }

  private requestBrowserNotificationPermission(): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {
        // Ignore permission errors and keep in-app notifications working.
      });
    }
  }

  private showBrowserNotification(payload: any): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
    if (Notification.permission !== 'granted') {
      return;
    }

    const title = this.getNotificationTitle(payload?.type);
    const body = payload?.message || 'You have a new notification in Med-Connect.';
    const notification = new Notification(title, {
      body,
      tag: payload?.notificationId || payload?.type || 'medconnect-notification'
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  private getNotificationTitle(type?: string): string {
    switch (type) {
      case 'CONNECTION_REQUEST':
        return 'New Connection Request';
      case 'CONNECTION_ACCEPTED':
        return 'Connection Accepted';
      case 'CONNECTION_REJECTED':
        return 'Connection Update';
      case 'APPOINTMENT_REQUEST':
        return 'New Appointment Request';
      case 'APPOINTMENT_CONFIRMED':
        return 'Appointment Confirmed';
      case 'APPOINTMENT_REJECTED':
      case 'APPOINTMENT_CANCELLED':
        return 'Appointment Update';
      default:
        return 'Med-Connect Notification';
    }
  }
}