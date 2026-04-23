import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { DoctorService, ProfileResponse } from '../../services/doctor';

@Component({
  selector: 'app-doctor-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class DoctorProfileComponent implements OnInit {
  profileForm: FormGroup;
  loading = true;
  saving = false;
  successMessage = '';
  formError = '';
  error = '';

  constructor(
    private fb: FormBuilder,
    private doctorService: DoctorService,   // ← Changed from DoctorProfile
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      email: [{ value: '', disabled: true }],
      phone: [''],
      specialty: [''],
      hospital: [''],
      yearsOfExperience: [''],
      consultationFee: [''],
      bio: ['']
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.error = '';
    this.doctorService.getProfile().subscribe({
      next: (res: ProfileResponse) => {
        if (res.success && res.user) {
          const d = res.user;
          this.profileForm.patchValue({
            firstName: d.firstName || '',
            lastName: d.lastName || '',
            email: d.email || '',
            phone: d.phone || '',
            specialty: d.specialty || '',
            hospital: d.hospital || '',
            yearsOfExperience: d.yearsOfExperience || '',
            consultationFee: d.consultationFee || '',
            bio: d.bio || ''
          });
        } else {
          this.error = 'Failed to load profile.';
        }
        this.loading = false;
      },
      error: (err: any) => {
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
    delete updateData.email;

    this.doctorService.updateProfile(updateData).subscribe({
      next: (res: ProfileResponse) => {
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
      error: (err: any) => {
        this.formError = 'An error occurred. Please try again.';
        this.saving = false;
      }
    });
  }

  resetForm(): void {
    this.loadProfile();
  }
}