import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DoctorProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  specialty?: string;
  phone?: string;
  hospital?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  bio?: string;
  availabilityScheduleJson?: string;
  slotDuration?: number;
  availabilityLocation?: string;
}

export interface ProfileResponse {
  success: boolean;
  message?: string;
  user?: any;
  doctor?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    specialty?: string;
    hospital?: string;
    yearsOfExperience?: number;
    bio?: string;
    isVerified: boolean;
    consultationFee: number;
    availabilityScheduleJson?: string;
    slotDuration?: number;
    availabilityLocation?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class DoctorProfile {
  
  private apiUrl = `${environment.doctorApiUrl}/doctors`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  updateProfile(profileData: DoctorProfileData): Observable<ProfileResponse> {
    return this.http.patch<ProfileResponse>(
      `${this.apiUrl}/profile`,
      profileData,
      { headers: this.getHeaders() }
    );
  }

  completeOnboarding(): Observable<ProfileResponse> {
    return this.http.patch<ProfileResponse>(
      `${this.apiUrl}/complete-onboarding`,
      {},
      { headers: this.getHeaders() }
    );
  }

  getCurrentDoctor(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(
      `${this.apiUrl}/me`,
      { headers: this.getHeaders() }
    );
  }

}
