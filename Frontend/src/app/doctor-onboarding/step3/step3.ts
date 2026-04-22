import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OnboardingService } from '../../services/onboarding';
import { DoctorProfile } from '../../services/doctor-profile';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-step3',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './step3.html',
  styleUrl: './step3.css',
})
export class Step3 {
  bio = '';
  isSubmitting = false;

  constructor(
    private onboardingService: OnboardingService,
    private doctorProfileService: DoctorProfile,
    private http: HttpClient,
    private router: Router
  ) {}

  close() {
    this.onboardingService.close();
  }

  back() {
    this.onboardingService.previousStep();
  }

  complete() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    // Save bio
    this.onboardingService.saveStep3Data({ bio: this.bio });

    // Get all onboarding data
    const profileData = this.onboardingService.getOnboardingData();

    console.log('📝 Submitting profile data:', profileData);

    // Step 1: Update doctor profile
    this.doctorProfileService.updateProfile(profileData).subscribe({
      next: (response) => {
        console.log('✅ Profile updated:', response);
        
        if (response.success) {
          // Step 2: Save availability settings if they exist
          if (profileData.availability) {
            this.saveAvailability(profileData.availability);
          } else {
            this.completeOnboarding();
          }
        }
      },
      error: (error) => {
        console.error('❌ Error saving profile:', error);
        this.isSubmitting = false;
        alert('Failed to save profile. Please try again.');
      }
    });
  }

  saveAvailability(availabilityData: any): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    console.log('📅 Saving availability:', availabilityData);

    this.http.put(
      'http://localhost:5000/api/availability/settings',
      availabilityData,
      { headers }
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Availability saved:', response);
        this.completeOnboarding();
      },
      error: (error) => {
        console.error('❌ Error saving availability:', error);
        // Continue with onboarding even if availability fails
        this.completeOnboarding();
      }
    });
  }

  completeOnboarding(): void {
    this.doctorProfileService.completeOnboarding().subscribe({
      next: (completeResponse) => {
        console.log('✅ Onboarding complete:', completeResponse);
        this.isSubmitting = false;
        
        // Update localStorage with verified user
        if (completeResponse.user) {
          localStorage.setItem('currentUser', JSON.stringify(completeResponse.user));
        }
        
        this.onboardingService.nextStep(); // Go to success step
      },
      error: (error) => {
        console.error('❌ Error completing onboarding:', error);
        this.isSubmitting = false;
        alert('Profile saved but failed to complete onboarding');
      }
    });
  }
}
