// frontend/src/app/services/appointment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface Availability {
  date: string;
  dayName: string;
  slots: TimeSlot[];
  slotDuration: number;
  location: string;
}

export interface Appointment {
  _id: string;
  patient: any;
  doctor: any;
  connection: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'in-person' | 'video';
  reason: string;
  notes: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected';
  location: string;
  cancelReason?: string;
  cancelledBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentResponse {
  success: boolean;
  message?: string;
  appointment?: Appointment;
  appointments?: Appointment[];
  availability?: Availability;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private apiUrl = 'http://localhost:8086/api/appointments';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getDoctorAvailability(doctorId: string, date: string): Observable<AppointmentResponse> {
    console.log('📅 Getting availability for doctor:', doctorId, 'on', date);
    
    return this.http.get<AppointmentResponse>(
      `${this.apiUrl}/doctor/${doctorId}/availability?date=${date}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Availability response:', response)),
      catchError(error => {
        console.error('❌ Get availability error:', error);
        return throwError(() => error);
      })
    );
  }

  bookAppointment(appointmentData: {
    doctorId: string;
    date: string;
    startTime: string;
    endTime: string;
    type: 'in-person' | 'video';
    reason: string;
    notes?: string;
  }): Observable<AppointmentResponse> {
    console.log('📝 Booking appointment:', appointmentData);
    
    return this.http.post<AppointmentResponse>(
      `${this.apiUrl}/book`,
      appointmentData,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Book appointment response:', response)),
      catchError(error => {
        console.error('❌ Book appointment error:', error);
        return throwError(() => error);
      })
    );
  }

  getPatientAppointments(status?: string): Observable<AppointmentResponse> {
    console.log('📋 Getting patient appointments, status:', status);
    
    const url = status 
      ? `${this.apiUrl}/patient?status=${status}`
      : `${this.apiUrl}/patient`;
    
    return this.http.get<AppointmentResponse>(
      url,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Patient appointments response:', response)),
      catchError(error => {
        console.error('❌ Get patient appointments error:', error);
        return throwError(() => error);
      })
    );
  }

  getDoctorAppointments(status?: string, date?: string): Observable<AppointmentResponse> {
    console.log('📋 Getting doctor appointments, status:', status, 'date:', date);
    
    let url = `${this.apiUrl}/doctor`;
    const params = [];
    if (status) params.push(`status=${status}`);
    if (date) params.push(`date=${date}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    
    return this.http.get<AppointmentResponse>(
      url,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Doctor appointments response:', response)),
      catchError(error => {
        console.error('❌ Get doctor appointments error:', error);
        return throwError(() => error);
      })
    );
  }

  respondToAppointment(appointmentId: string, action: 'accept' | 'reject', rejectionReason?: string): Observable<AppointmentResponse> {
    console.log('📢 Responding to appointment:', appointmentId, action);
    
    return this.http.patch<AppointmentResponse>(
      `${this.apiUrl}/${appointmentId}/respond`,
      { action, rejectionReason },
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Respond to appointment response:', response)),
      catchError(error => {
        console.error('❌ Respond to appointment error:', error);
        return throwError(() => error);
      })
    );
  }

  cancelAppointment(appointmentId: string, reason?: string): Observable<AppointmentResponse> {
    console.log('🚫 Cancelling appointment:', appointmentId);
    
    return this.http.patch<AppointmentResponse>(
      `${this.apiUrl}/${appointmentId}/cancel`,
      { reason },
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Cancel appointment response:', response)),
      catchError(error => {
        console.error('❌ Cancel appointment error:', error);
        return throwError(() => error);
      })
    );
  }
}