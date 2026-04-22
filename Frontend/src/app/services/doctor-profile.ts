import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DoctorProfileData {
  specialty?: string;
  phone?: string;
  hospital?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  bio?: string;
}

export interface ProfileResponse {
  success: boolean;
  message?: string;
  user?: any;
}

@Injectable({
  providedIn: 'root',
})
export class DoctorProfile {
  
  private apiUrl = 'http://localhost:8086/api/doctors';

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

}
