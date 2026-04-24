import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OnboardingService } from '../../services/onboarding';
import { DoctorProfile } from '../../services/doctor-profile';

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
    private doctorProfileService: DoctorProfile
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
    const storedUser = localStorage.getItem('currentUser');
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    const payload = {
      specialty: profileData.specialty,
      phone: profileData.phone,
      hospital: profileData.hospital,
      yearsOfExperience: profileData.yearsOfExperience,
      consultationFee: profileData.consultationFee,
      bio: profileData.bio,
      availabilityScheduleJson: profileData.availability?.schedule
        ? JSON.stringify(profileData.availability.schedule)
        : undefined,
      slotDuration: profileData.availability?.slotDuration,
      availabilityLocation: profileData.availability?.location,
      firstName: currentUser?.firstName,
      lastName: currentUser?.lastName,
      email: currentUser?.email
    };

    console.log('📝 Submitting profile data:', payload);

    // Step 1: Update doctor profile
    this.doctorProfileService.updateProfile(payload).subscribe({
      next: (response) => {
        console.log('✅ Profile updated:', response);
        
        if (response.success) {
          this.completeOnboarding();
        }
      },
      error: (error) => {
        console.error('❌ Error saving profile:', error);
        this.isSubmitting = false;
        alert('Failed to save profile. Please try again.');
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
          const storedUser = localStorage.getItem('currentUser');
          const currentUser = storedUser ? JSON.parse(storedUser) : {};
          const mergedUser = { ...(currentUser ?? {}), ...completeResponse.user };
          localStorage.setItem('currentUser', JSON.stringify(mergedUser));
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
