import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PatientProfileService } from '../../services/patient-profile';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class PatientProfile implements OnInit {
  profileForm: FormGroup;
  loading = true;
  saving = false;
  successMessage = '';
  formError = '';
  error = '';

  constructor(
    private fb: FormBuilder,
    private profileService: PatientProfileService
  ) {
    this.profileForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      email: [{ value: '', disabled: true }],
      phone: [''],
      dateOfBirth: [''],
      gender: [''],
      address: ['']
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.error = '';
    this.profileService.getMyProfile().subscribe({
      next: (res) => {
        if (res.success && res.patient) {
          const p = res.patient;
          this.profileForm.patchValue({
            firstName: p.firstName || '',
            lastName: p.lastName || '',
            email: p.email || '',
            phone: p.phone || '',
            dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '',
            gender: p.gender || '',
            address: p.address || ''
          });
        } else {
          this.error = 'Failed to load profile.';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Unable to connect to server.';
        this.loading = false;
      }
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.saving = true;
    this.successMessage = '';
    this.formError = '';

    const formValue = this.profileForm.getRawValue();
    const updateData: any = {};
    Object.keys(formValue).forEach(key => {
      if (formValue[key] !== null && formValue[key] !== '') {
        updateData[key] = formValue[key];
      }
    });
    delete updateData.email; // email cannot be changed

    this.profileService.updateProfile(updateData).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage = 'Profile updated successfully!';
          const stored = localStorage.getItem('currentUser');
          if (stored) {
            const user = JSON.parse(stored);
            user.firstName = updateData.firstName || user.firstName;
            user.lastName = updateData.lastName || user.lastName;
            localStorage.setItem('currentUser', JSON.stringify(user));
          }
        } else {
          this.formError = res.message || 'Update failed.';
        }
        this.saving = false;
      },
      error: () => {
        this.formError = 'An error occurred. Please try again.';
        this.saving = false;
      }
    });
  }

  resetForm(): void {
    this.loadProfile();
  }
}