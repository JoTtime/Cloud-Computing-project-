import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Connection {
  _id: string;
  patient: any;
  doctor: any;
  records: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'revoked';
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionResponse {
  success: boolean;
  message?: string;
  connection?: Connection;
  connections?: Connection[];
  isConnected?: boolean;
  isPending?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ConnectionService {

 
  private apiUrl = `${environment.apiUrl}/connections`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    console.log('🔑 Token present:', !!token);
    
    if (!token) {
      console.warn('⚠️ No token found in localStorage');
    }
    
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Patient requests connection to doctor
  requestConnection(doctorId: string, recordIds: string[] = []): Observable<ConnectionResponse> {
    console.log('📤 Requesting connection to doctor:', doctorId);
    
    return this.http.post<ConnectionResponse>(
      `${this.apiUrl}/request`,
      { doctorId, recordIds },
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Connection request response:', response)),
      catchError(error => {
        console.error('❌ Connection request error:', error);
        return throwError(() => error);
      })
    );
  }

  // Check if patient is connected to doctor
  checkConnection(doctorId: string): Observable<ConnectionResponse> {
    console.log('🔍 Checking connection to doctor:', doctorId);
    
    return this.http.get<ConnectionResponse>(
      `${this.apiUrl}/check/${doctorId}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Check connection response:', response)),
      catchError(error => {
        console.error('❌ Check connection error:', error);
        return throwError(() => error);
      })
    );
  }

  // Get patient's connections
  getPatientConnections(): Observable<ConnectionResponse> {
    console.log('📋 Fetching patient connections...');
    
    return this.http.get<ConnectionResponse>(
      `${this.apiUrl}/patient`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Patient connections response:', response)),
      catchError(error => {
        console.error('❌ Patient connections error:', error);
        return throwError(() => error);
      })
    );
  }

  // Get doctor's connections (connected patients)
  getDoctorConnections(): Observable<ConnectionResponse> {
    console.log('📋 Fetching doctor connections...');
    console.log('🌐 API URL:', `${this.apiUrl}/doctor`);
    
    const headers = this.getHeaders();
    console.log('📨 Request headers:', {
      'Content-Type': headers.get('Content-Type'),
      'Authorization': headers.get('Authorization') ? 'Bearer [TOKEN]' : 'Missing'
    });
    
    return this.http.get<ConnectionResponse>(
      `${this.apiUrl}/doctor`,
      { headers }
    ).pipe(
      tap(response => {
        console.log('✅ Doctor connections response:', response);
        if (response.connections) {
          console.log('📊 Number of connections:', response.connections.length);
        }
      }),
      catchError(error => {
        console.error('❌ Doctor connections error:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error body:', error.error);
        return throwError(() => error);
      })
    );
  }

  // Doctor responds to connection request
  respondToConnection(connectionId: string, action: 'accept' | 'reject'): Observable<ConnectionResponse> {
    console.log('📝 Responding to connection:', { connectionId, action });
    
    return this.http.patch<ConnectionResponse>(
      `${this.apiUrl}/${connectionId}/respond`,
      { action },
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Respond connection response:', response)),
      catchError(error => {
        console.error('❌ Respond connection error:', error);
        return throwError(() => error);
      })
    );
  }

  // Revoke connection
  revokeConnection(connectionId: string): Observable<ConnectionResponse> {
    console.log('🚫 Revoking connection:', connectionId);
    
    return this.http.delete<ConnectionResponse>(
      `${this.apiUrl}/${connectionId}/revoke`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Revoke connection response:', response)),
      catchError(error => {
        console.error('❌ Revoke connection error:', error);
        return throwError(() => error);
      })
    );
  }
  
}
