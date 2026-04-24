import { Component , EventEmitter, Output} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OnboardingService } from '../../services/onboarding';

@Component({
  selector: 'app-step1',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './step1.html',
  styleUrl: './step1.css',
})
export class Step1 {

  
  specialty = '';
  phone = '';
  hospital = '';
  experience = 0;
  fee = 0;

  constructor(private onboardingService: OnboardingService) {}

  ngOnInit(): void {
    const savedData = this.onboardingService.getOnboardingData();
    this.specialty = savedData.specialty ?? '';
    this.phone = savedData.phone ?? '';
    this.hospital = savedData.hospital ?? '';
    this.experience = Number(savedData.yearsOfExperience) || 0;
    this.fee = Number(savedData.consultationFee) || 0;
  }

  close() {
    this.onboardingService.close();
  }

  next() {
    if (!this.specialty || !this.phone) {
      alert('Please fill in the required fields!');
      return;
    }

    // Save data to service
    this.onboardingService.saveStep1Data({
      specialty: this.specialty,
      phone: this.phone,
      hospital: this.hospital,
      yearsOfExperience: this.experience,
      consultationFee: this.fee
    });

    this.onboardingService.nextStep();
  }

}
