import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Patient {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarColor: string;
  patientId: string;
  registeredDate: string;
  status: 'Active' | 'Pending' | 'Inactive';
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarColor: string;
  specialty: string;
  rating: number;
  patientsCount: number;
  joinedDate: string;
  status: 'active' | 'off-duty';
}

export interface RegistrationData {
  labels: string[];
  patients: number[];
  doctors: number[];
}
export interface SpecialtyData { labels: string[]; counts: number[]; }
export interface PatientStatusData { labels: string[]; counts: number[]; }
export interface CumulativeData { labels: string[]; values: number[]; }

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  getAllPatients(): Observable<{ success: boolean; patients: Patient[] }> {
    return this.http.get<{ success: boolean; patients: Patient[] }>(
      `${this.apiUrl}/patients`,
      { headers: this.getHeaders() }
    );
  }

  deletePatient(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.apiUrl}/patients/${id}`,
      { headers: this.getHeaders() }
    );
  }
  invitePatient(email: string): Observable<{ success: boolean; message?: string }> {
  return this.http.post<{ success: boolean }>(
    `${this.apiUrl}/patients/invite`,
    { email },
    { headers: this.getHeaders() }
  );
}
getAllDoctors(): Observable<{ success: boolean; doctors: Doctor[] }> {
  return this.http.get<{ success: boolean; doctors: Doctor[] }>(
    `${this.apiUrl}/doctors`,
    { headers: this.getHeaders() }
  );
}

deleteDoctor(id: string): Observable<{ success: boolean }> {
  return this.http.delete<{ success: boolean }>(
    `${this.apiUrl}/doctors/${id}`,
    { headers: this.getHeaders() }
  );
}

inviteDoctor(email: string): Observable<{ success: boolean; message?: string }> {
  return this.http.post<{ success: boolean }>(
    `${this.apiUrl}/doctors/invite`,
    { email },
    { headers: this.getHeaders() }
  );
}
getRegistrations(period: string): Observable<{ success: boolean; data: RegistrationData }> {
  return this.http.get<{ success: boolean; data: RegistrationData }>(
    `${this.apiUrl}/analytics/registrations?period=${period}`,
    { headers: this.getHeaders() }
  );
}
getSpecialtyStats(): Observable<{ success: boolean; data: SpecialtyData }> {
  return this.http.get<{ success: boolean; data: SpecialtyData }>(
    `${this.apiUrl}/analytics/specialties`,
    { headers: this.getHeaders() }
  );
}
getPatientStatus(): Observable<{ success: boolean; data: PatientStatusData }> {
  return this.http.get<{ success: boolean; data: PatientStatusData }>(
    `${this.apiUrl}/analytics/patient-status`,
    { headers: this.getHeaders() }
  );
}
getCumulativeGrowth(period: string): Observable<{ success: boolean; data: CumulativeData }> {
  return this.http.get<{ success: boolean; data: CumulativeData }>(
    `${this.apiUrl}/analytics/cumulative?period=${period}`,
    { headers: this.getHeaders() }
  );
}
getAdminProfile(): Observable<{ success: boolean; user: any }> {
  return this.http.get<{ success: boolean; user: any }>(
    `${this.apiUrl}/profile`,
    { headers: this.getHeaders() }
  );
}

updateAdminProfile(data: any): Observable<{ success: boolean; message?: string }> {
  return this.http.patch<{ success: boolean; message?: string }>(
    `${this.apiUrl}/profile`,
    data,
    { headers: this.getHeaders() }
  );
}
}