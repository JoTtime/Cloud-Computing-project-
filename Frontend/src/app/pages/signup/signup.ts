import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Auth, AuthResponse } from '../../services/auth';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup {

   signupForm: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: Auth
  ) {
    this.signupForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(3)]],
      lastName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phone: ['', [Validators.required, Validators.pattern(/^\+237[6-9]\d{8}$/)]],
      address: ['', Validators.required],
      userType: ['patient', Validators.required]
    });
  }

  get firstName() {
    return this.signupForm.get('firstName');
  }

  get lastName() {
    return this.signupForm.get('lastName');
  }

  get email() {
    return this.signupForm.get('email');
  }

  get password() {
    return this.signupForm.get('password');
  }

  get phone() {
    return this.signupForm.get('phone');
  }

  get address() {
    return this.signupForm.get('address');
  }

  get userType() {
    return this.signupForm.get('userType');
  }

  onSubmit() {
    if (this.signupForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      
      const signupData = {
        firstName: this.signupForm.value.firstName,
        lastName: this.signupForm.value.lastName,
        email: this.signupForm.value.email,
        password: this.signupForm.value.password,
        phone: this.signupForm.value.phone,
        address: this.signupForm.value.address,
        userType: this.signupForm.value.userType
      };
      
      console.log('📝 Attempting signup...');
      
      this.authService.signUp(signupData).subscribe({
        next: (response) => {
          console.log('📝 Signup response:', response);
          this.loading = false;
          
          if (response.success && response.data) {
            const user = response.data.user;

            if (user.userType === 'doctor') {
              // Doctors must wait for admin approval — do NOT redirect to dashboard
              this.router.navigate(['/login']);
              alert('Your doctor account has been created and is pending admin approval. You will be able to log in once approved.');
            } else if (user.userType === 'admin') {
              this.router.navigate(['/admin-dashboard']);
            } else {
              this.router.navigate(['/patient-dashboard']);
            }
          }
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.message || 'Sign up failed. Please try again.';
          console.error('🔴 Signup error:', error);
        }
      });
    } else {
      Object.keys(this.signupForm.controls).forEach(key => {
        this.signupForm.get(key)?.markAsTouched();
      });
    }
  }

  navigateToSignIn() {
    this.router.navigate(['login']);
  }

}
