import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class AdminProfile implements OnInit {
  profileForm: FormGroup;
  loading = true;
  saving = false;
  successMessage = '';
  formError = '';
  error = ''; // network/load error

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: [{ value: '', disabled: true }],
      phone: [''],
      role: [{ value: '', disabled: true }]
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.error = '';
    this.adminService.getAdminProfile().subscribe({
      next: (res) => {
        if (res.success && res.user) {
          const user = res.user;
          this.profileForm.patchValue({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'Admin'
          });
        } else {
          this.error = 'Failed to load profile data.';
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
    if (formValue.firstName) updateData.firstName = formValue.firstName;
    if (formValue.lastName) updateData.lastName = formValue.lastName;
    if (formValue.phone) updateData.phone = formValue.phone;

    this.adminService.updateAdminProfile(updateData).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage = 'Profile updated successfully!';
          // Update localStorage
          const stored = localStorage.getItem('currentUser');
          if (stored) {
            const user = JSON.parse(stored);
            user.firstName = updateData.firstName || user.firstName;
            user.lastName = updateData.lastName || user.lastName;
            user.phone = updateData.phone || user.phone;
            localStorage.setItem('currentUser', JSON.stringify(user));
          }
        } else {
          this.formError = res.message || 'Update failed.';
        }
        this.saving = false;
      },
      error: (err) => {
        console.error(err);
        this.formError = 'An error occurred. Please try again.';
        this.saving = false;
      }
    });
  }

  resetForm(): void {
    this.loadProfile(); // reload original data
  }
}