import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  userType: 'patient' | 'doctor' | 'admin';
  isVerified: boolean;
  createdAt?: string;
}

export interface StatsPoint {
  label: string;
  count: number;
}

export interface RegistrationStats {
  period: 'week' | 'month' | 'year';
  totals: {
    patients: number;
    doctors: number;
    allUsers: number;
  };
  pendingDoctorApprovals: number;
  patientSeries: StatsPoint[];
  doctorSeries: StatsPoint[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private baseUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  getUsers(params?: { userType?: string; verified?: boolean }): Observable<{ success: boolean; users: AdminUser[] }> {
    const query = new URLSearchParams();
    if (params?.userType) query.set('userType', params.userType);
    if (params?.verified !== undefined) query.set('verified', String(params.verified));
    const qs = query.toString();
    const url = qs ? `${this.baseUrl}/users?${qs}` : `${this.baseUrl}/users`;
    return this.http.get<{ success: boolean; users: AdminUser[] }>(url, { headers: this.getHeaders() });
  }

  getUserById(id: string): Observable<{ success: boolean; user: AdminUser }> {
    return this.http.get<{ success: boolean; user: AdminUser }>(`${this.baseUrl}/users/${id}`, {
      headers: this.getHeaders(),
    });
  }

  approveDoctor(id: string): Observable<{ success: boolean; message: string; user: AdminUser }> {
    return this.http.patch<{ success: boolean; message: string; user: AdminUser }>(
      `${this.baseUrl}/users/${id}/approve-doctor`,
      {},
      { headers: this.getHeaders() }
    );
  }

  deleteUser(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/users/${id}`, {
      headers: this.getHeaders(),
    });
  }

  getStatistics(period: 'week' | 'month' | 'year'): Observable<{ success: boolean; data: RegistrationStats }> {
    return this.http.get<{ success: boolean; data: RegistrationStats }>(
      `${this.baseUrl}/statistics?period=${period}`,
      { headers: this.getHeaders() }
    );
  }
}
