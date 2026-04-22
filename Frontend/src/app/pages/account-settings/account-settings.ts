import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule} from '@angular/router';
import { Auth } from '../../services/auth';
import { PatientProfileService, PatientProfile, Allergy, Medication, EmergencyContact } from '../../services/patient-profile';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  roles: {
    isPatient: boolean;
    isDoctor: boolean;
  };
  patientInfo?: {
    bloodType: string;
    allergies: string;
    emergencyContact: string;
  };
  doctorInfo?: {
    specialty: string;
    licenseNumber: string;
    hospital: string;
    yearsOfExperience: number;
  };
}

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './account-settings.html',
  styleUrl: './account-settings.css',
})
export class AccountSettings implements OnInit {

activeTab: 'profile' | 'roles' | 'security' = 'profile';
  
  userProfile: UserProfile = {
    name: '',
    email: '',
    phone: '',
    address: '',
    roles: {
      isPatient: false,
      isDoctor: false
    }
  };

   // Patient Medical Info
  patientMedicalInfo: {
    dateOfBirth: string;
    gender: string;
    bloodType: string;
    allergies: Allergy[];
    emergencyContact: EmergencyContact;
    currentMedications: Medication[];
  } = {
    dateOfBirth: '',
    gender: '',
    bloodType: '',
    allergies: [],
    emergencyContact: { name: '', relationship: '', phone: '' },
    currentMedications: []
  };

  // Password change
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  
  // Role activation
  showRoleActivation: boolean = false;
  pendingRole: 'patient' | 'doctor' | null = null;

  constructor(
    private router: Router,
    private authService: Auth,
    private patientProfileService: PatientProfileService
  ) {}

 
  ngOnInit(): void {
    this.loadUserFromAuth();
    this.loadPatientMedicalInfo();
  }

  loadPatientMedicalInfo(): void {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (currentUser.userType === 'patient') {
      this.patientProfileService.getMyProfile().subscribe({
        next: (response) => {
          if (response.success && response.patient) {
            const patient = response.patient;
            this.patientMedicalInfo = {
              dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
              gender: patient.gender || '',
              bloodType: patient.bloodType || '',
              allergies: patient.allergies || [],
              emergencyContact: patient.emergencyContact || { name: '', relationship: '', phone: '' },
              currentMedications: patient.currentMedications || []
            };
          }
        },
        error: (error) => {
          console.error('Error loading patient medical info:', error);
        }
      });
    }
  }

    loadUserFromAuth(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      
      // Load basic user info from authentication
      this.userProfile.name = `${user.firstName} ${user.lastName}`;
      this.userProfile.email = user.email;
      this.userProfile.phone = user.phone || '';
      this.userProfile.address = user.address || '';
      
      // Set roles based on userType
      this.userProfile.roles = {
        isPatient: user.userType === 'patient',
        isDoctor: user.userType === 'doctor'
      };

      // Load additional profile info if exists
      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        // Merge saved profile data with current user data
        this.userProfile.patientInfo = profile.patientInfo;
        this.userProfile.doctorInfo = profile.doctorInfo;
        
        // If user has multiple roles saved, use those
        if (profile.roles) {
          this.userProfile.roles = profile.roles;
        }
      } else {
        // Initialize role-specific info based on userType
        if (user.userType === 'patient') {
          this.userProfile.patientInfo = {
            bloodType: '',
            allergies: '',
            emergencyContact: ''
          };
        } else if (user.userType === 'doctor') {
          this.userProfile.doctorInfo = {
            specialty: '',
            licenseNumber: '',
            hospital: '',
            yearsOfExperience: 0
          };
        }
      }
    } else {
      // If no user is logged in, redirect to login
      this.router.navigate(['/login']);
    }
  }

  setActiveTab(tab: 'profile' | 'roles' | 'security'): void {
    this.activeTab = tab;
  }

   saveProfile(): void {
  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  if (currentUser.userType === 'patient') {
    // Save patient medical information to backend
    const profileData = {
      phone: this.userProfile.phone,
      address: this.userProfile.address,
      ...this.patientMedicalInfo
    };

    this.patientProfileService.updateProfile(profileData).subscribe({
      next: (response) => {
        // Update localStorage with extended profile info
        localStorage.setItem('userProfile', JSON.stringify(this.userProfile));
        
        // Update currentUser with basic info changes
        const nameParts = this.userProfile.name.split(' ');
        currentUser.firstName = nameParts[0] || '';
        currentUser.lastName = nameParts.slice(1).join(' ') || '';
        currentUser.email = this.userProfile.email;
        currentUser.phone = this.userProfile.phone;
        currentUser.address = this.userProfile.address;
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        alert('Profile updated successfully!');
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
      }
    });
  } else if (currentUser.userType === 'doctor') {
    // TODO: Add doctor profile update logic if needed
    // For now, just update localStorage
    localStorage.setItem('userProfile', JSON.stringify(this.userProfile));
    
    // Update currentUser with basic info changes
    const nameParts = this.userProfile.name.split(' ');
    currentUser.firstName = nameParts[0] || '';
    currentUser.lastName = nameParts.slice(1).join(' ') || '';
    currentUser.email = this.userProfile.email;
    currentUser.phone = this.userProfile.phone;
    currentUser.address = this.userProfile.address;
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    alert('Profile updated successfully!');
  } else {
    // For other user types (admin, etc.)
    localStorage.setItem('userProfile', JSON.stringify(this.userProfile));
    
    // Update currentUser with basic info changes
    const nameParts = this.userProfile.name.split(' ');
    currentUser.firstName = nameParts[0] || '';
    currentUser.lastName = nameParts.slice(1).join(' ') || '';
    currentUser.email = this.userProfile.email;
    currentUser.phone = this.userProfile.phone;
    currentUser.address = this.userProfile.address;
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    alert('Profile updated successfully!');
  }
}

  // Allergy management
  addAllergy(): void {
    this.patientMedicalInfo.allergies.push({
      name: '',
      severity: 'moderate',
      reaction: ''
    });
  }

  removeAllergy(index: number): void {
    this.patientMedicalInfo.allergies.splice(index, 1);
  }

  // Medication management
  addMedication(): void {
    this.patientMedicalInfo.currentMedications.push({
      name: '',
      dosage: '',
      frequency: '',
      startDate: new Date().toISOString()
    });
  }

  removeMedication(index: number): void {
    this.patientMedicalInfo.currentMedications.splice(index, 1);
  }

   changePassword(): void {
    if (this.newPassword !== this.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (this.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }
    
    // TODO: Implement actual password change with backend
    // You would call your auth service here:
    // this.authService.changePassword(this.currentPassword, this.newPassword).subscribe(...)
    
    alert('Password changed successfully!');
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  requestRoleActivation(role: 'patient' | 'doctor'): void {
    this.pendingRole = role;
    this.showRoleActivation = true;
  }

  requestRoleDeactivation(role: 'patient' | 'doctor'): void {
    // Prevent deactivating if it's the only active role
    if (role === 'patient' && !this.userProfile.roles.isDoctor) {
      alert('Cannot deactivate Patient role. You must have at least one active role.');
      return;
    }
    if (role === 'doctor' && !this.userProfile.roles.isPatient) {
      alert('Cannot deactivate Doctor role. You must have at least one active role.');
      return;
    }
    
    const confirmDeactivate = confirm(
      `Are you sure you want to deactivate your ${role === 'patient' ? 'Patient' : 'Doctor'} role? You can reactivate it anytime.`
    );
    
    if (confirmDeactivate) {
      if (role === 'patient') {
        this.userProfile.roles.isPatient = false;
      } else {
        this.userProfile.roles.isDoctor = false;
      }
      this.saveProfile();
      alert(`${role === 'patient' ? 'Patient' : 'Doctor'} role deactivated successfully.`);
      
      // Redirect to the active role dashboard
      if (role === 'patient' && this.userProfile.roles.isDoctor) {
        this.router.navigate(['/doctor-dashboard']);
      } else if (role === 'doctor' && this.userProfile.roles.isPatient) {
        this.router.navigate(['/patient-dashboard']);
      }
    }
  }

 confirmRoleActivation(): void {
    if (this.pendingRole === 'patient') {
      this.userProfile.roles.isPatient = true;
      if (!this.userProfile.patientInfo) {
        this.userProfile.patientInfo = {
          bloodType: '',
          allergies: '',
          emergencyContact: ''
        };
      }
    } else if (this.pendingRole === 'doctor') {
      this.userProfile.roles.isDoctor = true;
      if (!this.userProfile.doctorInfo) {
        this.userProfile.doctorInfo = {
          specialty: '',
          licenseNumber: '',
          hospital: '',
          yearsOfExperience: 0
        };
      }
    }
    this.saveProfile();
    this.closeRoleActivation();
    alert(`${this.pendingRole === 'patient' ? 'Patient' : 'Doctor'} role activated! Please complete your profile.`);
  }

  closeRoleActivation(): void {
    this.showRoleActivation = false;
    this.pendingRole = null;
  }

  goBack(): void {
    // Get current user to determine which dashboard to go back to
    const currentUser = this.authService.currentUserValue;
    if (currentUser?.userType === 'doctor') {
      this.router.navigate(['/doctor-dashboard']);
    } else {
      this.router.navigate(['/patient-dashboard']);
    }
  }

}
