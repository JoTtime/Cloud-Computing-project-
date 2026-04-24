import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Allergy {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface MedicalCondition {
  condition: string;
  diagnosedDate: string;
  notes: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
}

export interface VitalRecord {
  recordedAt: string;
  bloodPressureMmHg: string;
  heartRateBpm: number;
  temperatureCelsius: number;
  heightCm: number;
  weightKg: number;
}

export interface PatientProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  allergies?: Allergy[];
  emergencyContact?: EmergencyContact;
  medicalHistory?: MedicalCondition[];
  currentMedications?: Medication[];
  vitals?: VitalRecord[];
  doctorNotes?: string;
}

export interface PatientProfileResponse {
  success: boolean;
  message?: string;
  patient?: PatientProfile;
}

@Injectable({
  providedIn: 'root',
})
export class PatientProfileService {

  private apiUrl = `${environment.patientApiUrl}/patients`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private getJsonAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getMyProfile(): Observable<PatientProfileResponse> {
    return this.http.get<PatientProfileResponse>(
      `${this.apiUrl}/profile`,
      { headers: this.getAuthHeaders() }
    );
  }

  updateProfile(profileData: Partial<PatientProfile>): Observable<PatientProfileResponse> {
    return this.http.put<PatientProfileResponse>(
      `${this.apiUrl}/profile`,
      profileData,
      { headers: this.getJsonAuthHeaders() }
    );
  }

  getPatientById(id: string): Observable<PatientProfileResponse> {
    return this.http.get<PatientProfileResponse>(
      `${this.apiUrl}/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  updatePatientClinicalByDoctor(
    id: string,
    profileData: Partial<PatientProfile>
  ): Observable<PatientProfileResponse> {
    return this.http.put<PatientProfileResponse>(
      `${this.apiUrl}/${id}/clinical`,
      profileData,
      { headers: this.getJsonAuthHeaders() }
    );
  }
  
}
