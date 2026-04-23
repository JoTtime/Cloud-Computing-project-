import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';
import { Dashboard } from './patient/dashboard/dashboard';          // patient layout
import { DashboardHomeComponent } from './patient/dashboard-home/dashboard-home';
import { DashboardHomeDoctor } from './doctor/dashboard-home-doctor/dashboard-home-doctor';
import { FindDoctorsComponent } from './patient/find-doctors/find-doctors';
import { DashboardDoctor } from './doctor/dashboard-doctor/dashboard-doctor'; // doctor layout

export const routes: Routes = [
  // ==========================================
  // PUBLIC ROUTES
  // ==========================================
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'signup', component: Signup },
  {
    path: 'account-settings',
    loadComponent: () => import('./pages/account-settings/account-settings')
      .then(m => m.AccountSettings)
  },

  // ==========================================
  // PATIENT ROUTES (all under Dashboard layout)
  // ==========================================
  {
    path: 'patient',
    component: Dashboard,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardHomeComponent },
      { path: 'find-doctors', component: FindDoctorsComponent },
      {
        path: 'medical-records',
        loadComponent: () => import('./patient/records/records').then(m => m.Records)
      },
      {
        path: 'medical-records/upload',
        loadComponent: () => import('./features/upload-doc/upload-doc').then(m => m.UploadDoc)
      },
      {
        path: 'medical-records/:id',
        loadComponent: () => import('./features/detail/detail').then(m => m.Detail)
      },
      {
        path: 'appointment',
        loadComponent: () => import('./patient/appointment/appointment').then(m => m.Appointment)
      },
      {
        path: 'messages',
        loadComponent: () => import('./doctor/messages/messages').then(m => m.Messages)
      },
      {
        path: 'billing',
        loadComponent: () => import('./patient/billing/billing').then(m => m.Billing)
      }
    ]
  },

  // ==========================================
  // DOCTOR ROUTES (all under DashboardDoctor layout)
  // ==========================================
  {
    path: 'doctor',
    component: DashboardDoctor,           // layout with sidebar + topbar + <router-outlet>
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardHomeDoctor }, // you need to create/import this
      { path: 'patients', loadComponent: () => import('./doctor/patients/patients').then(c => c.Patients) },
      { path: 'patients/:id', loadComponent: () => import('./doctor/patient-detail/patient-detail').then(c => c.PatientDetail) },
      { path: 'schedule', loadComponent: () => import('./doctor/schedule/schedule').then(m => m.Schedule) },
      { path: 'billing', loadComponent: () => import('./patient/billing/billing').then(m => m.Billing) }, // or doctor-specific billing
      { path: 'messages', loadComponent: () => import('./doctor/messages/messages').then(m => m.Messages) },
    ]
  },

  // ==========================================
  // FALLBACK
  // ==========================================
  { path: '**', redirectTo: '/login' }
];