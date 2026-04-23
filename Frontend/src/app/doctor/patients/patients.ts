import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConnectionService, Connection } from '../../services/connection';

interface PatientDisplay {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  patientId: string;
  phone: string;
  email: string;
  status: 'Active' | 'Pending' | 'Inactive';
  lastVisit: string;
}

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './patients.html',
  styleUrls: ['./patients.css']
})
export class Patients implements OnInit {
  patients: PatientDisplay[] = [];
  filteredPatients: PatientDisplay[] = [];
  searchQuery = '';
  isLoading = true;

  showAddModal = false;
  newPatientEmail = '';

  constructor(private connectionService: ConnectionService) {}

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.isLoading = true;
    this.connectionService.getDoctorConnections().subscribe({
      next: (response: any) => {
        if (response.success && response.connections) {
          this.patients = response.connections.map((conn: Connection) => this.mapConnectionToPatient(conn));
          this.filteredPatients = [...this.patients];
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading patients', err);
        this.useMockData();
        this.isLoading = false;
      }
    });
  }

  mapConnectionToPatient(connection: Connection): PatientDisplay {
    const patient = connection.patient;
    const name = `${patient.firstName} ${patient.lastName}`;
    const initials = `${patient.firstName?.charAt(0) || ''}${patient.lastName?.charAt(0) || ''}`.toUpperCase();
    const colors = ['#0369a1', '#0891b2', '#0e7490', '#0284c7', '#06b6d4'];
    const colorIndex = (patient._id?.length || 0) % colors.length;
    
    return {
      id: patient._id,
      name: name,
      initials: initials,
      avatarColor: colors[colorIndex],
      patientId: `P-${patient._id?.slice(-5) || '00000'}`,
      phone: patient.phone || '—',
      email: patient.email || '—',
      status: connection.status === 'accepted' ? 'Active' : 'Pending',
      lastVisit: connection.updatedAt ? new Date(connection.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
    };
  }

  useMockData(): void {
    this.patients = [
      { id: '1', name: 'Amelia Chen', initials: 'AC', avatarColor: '#0369a1', patientId: 'P-10421', phone: '+1 (415) 555-0142', email: 'amelia@mail.com', status: 'Active', lastVisit: 'Apr 18' },
      { id: '2', name: 'Marcus Hill', initials: 'MH', avatarColor: '#0891b2', patientId: 'P-10422', phone: '+1 (415) 555-0188', email: 'marcus@mail.com', status: 'Active', lastVisit: 'Apr 16' },
      { id: '3', name: 'Sofia Reyes', initials: 'SR', avatarColor: '#0e7490', patientId: 'P-10423', phone: '+1 (415) 555-0210', email: 'sofia.parent@mail.com', status: 'Pending', lastVisit: 'Apr 12' },
      { id: '4', name: 'Jonas Müller', initials: 'JM', avatarColor: '#0284c7', patientId: 'P-10424', phone: '+49 30 5550199', email: 'jonas@mail.com', status: 'Active', lastVisit: 'Apr 10' },
      { id: '5', name: 'Priya Singh', initials: 'PS', avatarColor: '#06b6d4', patientId: 'P-10425', phone: '+91 98765 43210', email: 'priya@mail.com', status: 'Inactive', lastVisit: 'Mar 28' },
    ];
    this.filteredPatients = [...this.patients];
  }

  filterPatients(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredPatients = this.patients.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.email.toLowerCase().includes(query) ||
      p.patientId.toLowerCase().includes(query)
    );
  }

  get filteredPatientsList(): PatientDisplay[] {
    if (!this.searchQuery) return this.patients;
    const q = this.searchQuery.toLowerCase();
    return this.patients.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.patientId.toLowerCase().includes(q)
    );
  }

  openAddPatientModal(): void {
    this.showAddModal = true;
    this.newPatientEmail = '';
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  sendConnectionRequest(): void {
    if (!this.newPatientEmail || !this.newPatientEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    // Safe check: if the method exists on the service, call it
    const service = this.connectionService as any;
    if (typeof service.sendConnectionRequest === 'function') {
      service.sendConnectionRequest(this.newPatientEmail).subscribe({
        next: (response: any) => {
          if (response.success) {
            alert('Connection request sent successfully!');
            this.closeAddModal();
          } else {
            alert('Failed to send request. Please try again.');
          }
        },
        error: (err: any) => {
          console.error('Error sending request', err);
          alert('Error sending connection request. Please try again.');
        }
      });
    } else {
      // Fallback if the method is not implemented in the service
      alert('This feature is not yet implemented. Please use the admin panel to add patients.');
      this.closeAddModal();
    }
  }
}