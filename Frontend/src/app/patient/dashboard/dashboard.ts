import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SharedHeader } from '../../features/shared-header/shared-header';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { UploadDoc, DocumentResponse } from '../../services/upload-doc';
import { ConnectionService } from '../../services/connection';
import { AppointmentService, Appointment as AppointmentModel } from '../../services/appointment.service';
import { PatientProfileService } from '../../services/patient-profile';
import { NotificationService } from '../../services/notification';



interface StatCard {
  title: string;
  value: string | number;
  subtitle: string;
  iconType: string;
  iconColor: string;
  bgColor: string;
}

interface Document {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  date: string;
}

interface HealthInfo {
  iconType: string;
  iconBg: string;
  iconColor: string;
  title: string;
  value: string;
  badge?: string;
  badgeColor?: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  hospital: string;
  availableToday: boolean;
  isConnected: boolean;
}

interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SharedHeader, RouterModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {

   userName: string = '';
  loading: boolean = true;
  
  stats: StatCard[] = [
    {
      title: 'Connected Doctors',
      value: 0,
      subtitle: 'Loading...',
      iconType: 'doctors',
      iconColor: '#5FB3B3',
      bgColor: '#E8F8F8'
    },
    {
      title: 'Upcoming Appointments',
      value: 0,
      subtitle: 'Loading...',
      iconType: 'appointments',
      iconColor: '#4ECDC4',
      bgColor: '#E6F9F7'
    },
    {
      title: 'Health Score',
      value: '--',
      subtitle: 'Loading...',
      iconType: 'health',
      iconColor: '#28A745',
      bgColor: '#E8F5E9'
    }
  ];

  recentDocuments: Document[] = [];
  healthSummary: HealthInfo[] = [];
  private notificationRealtimeSubscription?: Subscription;

  healthTip = {
    title: 'Health Tip of the Day',
    content: 'Stay hydrated! Drinking adequate water helps maintain healthy organ function and improves overall well-being.',
    visible: true
  };

  // Category mapping
  private categoryColors: { [key: string]: string } = {
    'lab_results': '#4A90E2',
    'imaging': '#5FB3B3',
    'prescription': '#FFA07A',
    'clinical_notes': '#9B59B6',
    'vaccination_records': '#28A745',
    'others': '#6C757D'
  };

  private categoryLabels: { [key: string]: string } = {
    'lab_results': 'Lab Results',
    'imaging': 'Imaging',
    'prescription': 'Prescription',
    'clinical_notes': 'Clinical Notes',
    'vaccination_records': 'Vaccination Records',
    'others': 'Other'
  };

  constructor(
    private router: Router,
    private uploadDocService: UploadDoc,
    private connectionService: ConnectionService,
    private appointmentService: AppointmentService,
    private patientProfileService: PatientProfileService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.loadDashboardData();
    this.notificationService.startRealtime();
    this.notificationRealtimeSubscription = this.notificationService.realtime$.subscribe((event) => {
      if (event.eventName === 'notification' && this.isConnectionNotification(event.data?.type)) {
        this.refreshConnectionStats();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.notificationRealtimeSubscription) {
      this.notificationRealtimeSubscription.unsubscribe();
    }
  }

  loadUserData(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userName = `${user.firstName} ${user.lastName}`;
    }
  }

  loadDashboardData(): void {
    this.loading = true;

    // Load all dashboard data in parallel
    forkJoin({
      documents: this.uploadDocService.getMyDocuments(),
      connections: this.connectionService.getPatientConnections(),
      appointments: this.appointmentService.getPatientAppointments(),
      profile: this.patientProfileService.getMyProfile()
    }).subscribe({
      next: (results) => {
        console.log('✅ Dashboard data loaded:', results);
        
        // Process documents
        if (results.documents) {
          this.processDocuments(results.documents);
        }

        // Process connections
        if (results.connections.success) {
          this.processConnections(results.connections.connections || []);
        }

        // Process appointments
        if (results.appointments.success) {
          this.processAppointments(results.appointments.appointments || []);
        }

        // Process health profile
        if (results.profile.success && results.profile.patient) {
          this.processHealthProfile(results.profile.patient);
        }

        // Calculate health score
        this.calculateHealthScore(results.profile.patient);

        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading dashboard data:', error);
        this.loading = false;
        this.stats.forEach(stat => stat.subtitle = 'Unable to load');
      }
    });
  }

  processDocuments(documents: DocumentResponse[]): void {
    // Get 4 most recent documents
    const sortedDocs = [...documents].sort((a, b) => 
      new Date(b.docDate).getTime() - new Date(a.docDate).getTime()
    );

    this.recentDocuments = sortedDocs.slice(0, 4).map(doc => ({
      id: doc._id,
      title: doc.docTitle,
      category: this.categoryLabels[doc.category] || doc.category,
      categoryColor: this.categoryColors[doc.category] || '#6C757D',
      date: this.formatDate(doc.docDate)
    }));
  }

  processConnections(connections: any[]): void {
    // Normalize accepted connections and count unique doctors only.
    const acceptedConnections = connections.filter(conn =>
      String(conn?.status ?? '').toLowerCase() === 'accepted'
    );

    const uniqueDoctorIds = new Set<string>();
    acceptedConnections.forEach(conn => {
      const rawDoctor = conn?.doctor;
      if (!rawDoctor) return;

      // Backend may return doctor as object, _id field, or plain string id.
      if (typeof rawDoctor === 'string') {
        uniqueDoctorIds.add(rawDoctor);
        return;
      }

      const doctorId = rawDoctor._id || rawDoctor.id || rawDoctor.userId;
      if (doctorId) {
        uniqueDoctorIds.add(doctorId);
      }
    });

    const doctorStat = this.getStat('Connected Doctors');
    if (!doctorStat) return;
    doctorStat.value = uniqueDoctorIds.size;

    // Active doctor = at least one accepted connection with recent message/update.
    const activeDoctorIds = new Set<string>();
    acceptedConnections.forEach(conn => {
      const hasActivity = !!(conn?.lastMessageDate || conn?.updatedAt);
      if (!hasActivity) return;

      const rawDoctor = conn?.doctor;
      if (!rawDoctor) return;

      if (typeof rawDoctor === 'string') {
        activeDoctorIds.add(rawDoctor);
        return;
      }

      const doctorId = rawDoctor._id || rawDoctor.id || rawDoctor.userId;
      if (doctorId) {
        activeDoctorIds.add(doctorId);
      }
    });

    doctorStat.subtitle = activeDoctorIds.size > 0
      ? `${activeDoctorIds.size} active`
      : 'No active connections';
  }

  private refreshConnectionStats(): void {
    this.connectionService.getPatientConnections().subscribe({
      next: (response) => {
        if (response.success) {
          this.processConnections(response.connections || []);
        }
      },
      error: (error) => {
        console.error('❌ Error refreshing patient connections:', error);
      }
    });
  }

  private isConnectionNotification(type?: string): boolean {
    return type === 'CONNECTION_REQUEST' || type === 'CONNECTION_ACCEPTED' || type === 'CONNECTION_REJECTED';
  }

  processAppointments(appointments: AppointmentModel[]): void {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Filter upcoming appointments
    const upcomingAppointments = appointments.filter(apt => {
      const aptDate = this.parseDateOnly(apt.date);
      aptDate.setHours(0, 0, 0, 0);
      const normalizedStatus = String(apt.status ?? '').toLowerCase();
      return aptDate >= now && 
             normalizedStatus !== 'cancelled' && 
             normalizedStatus !== 'completed' &&
             normalizedStatus !== 'rejected';
    });

    const appointmentStat = this.getStat('Upcoming Appointments');
    if (!appointmentStat) return;
    appointmentStat.value = upcomingAppointments.length;

    // Get next appointment date
    if (upcomingAppointments.length > 0) {
      const sortedApts = upcomingAppointments.sort((a, b) => 
        this.parseDateOnly(a.date).getTime() - this.parseDateOnly(b.date).getTime()
      );
      const nextApt = sortedApts[0];
      const nextDate = new Date(nextApt.date);
      appointmentStat.subtitle = `Next: ${this.formatShortDate(nextDate)}`;
    } else {
      appointmentStat.subtitle = 'No upcoming appointments';
    }
  }

  processHealthProfile(patient: any): void {
    this.healthSummary = [];

    // Blood Type
    if (patient.bloodType) {
      this.healthSummary.push({
        iconType: 'droplet',
        iconBg: '#EBF5FF',
        iconColor: '#4A90E2',
        title: 'Blood Type',
        value: patient.bloodType
      });
    }

    // Allergies
    if (patient.allergies && patient.allergies.length > 0) {
      const allergyNames = patient.allergies
        .map((a: any) => a.name)
        .slice(0, 2)
        .join(', ');
      
      const hasSevereAllergy = patient.allergies.some((a: any) => 
        a.severity === 'severe'
      );

      this.healthSummary.push({
        iconType: 'alert',
        iconBg: '#FFEBEE',
        iconColor: '#DC3545',
        title: 'Allergies',
        value: allergyNames + (patient.allergies.length > 2 ? '...' : ''),
        badge: hasSevereAllergy ? 'Severe' : 'Important',
        badgeColor: hasSevereAllergy ? '#DC3545' : '#FF9800'
      });
    }

    // Current Medications
    if (patient.currentMedications && patient.currentMedications.length > 0) {
      this.healthSummary.push({
        iconType: 'pill',
        iconBg: '#F3E5F5',
        iconColor: '#9B59B6',
        title: 'Current Medications',
        value: `${patient.currentMedications.length} prescription${patient.currentMedications.length > 1 ? 's' : ''}`
      });
    }

    // If no health info, show placeholder
    if (this.healthSummary.length === 0) {
      this.healthSummary.push({
        iconType: 'alert',
        iconBg: '#FFF4E6',
        iconColor: '#FF9800',
        title: 'Health Profile',
        value: 'Complete your profile',
        badge: 'Action Required',
        badgeColor: '#FF9800'
      });
    }
  }

  calculateHealthScore(patient: any): void {
    const healthStat = this.getStat('Health Score');
    if (!healthStat) return;
    if (!patient) {
      healthStat.value = '--';
      healthStat.subtitle = 'No vitals yet';
      return;
    }

    const vitals = Array.isArray(patient.vitals) ? [...patient.vitals] : [];
    if (vitals.length === 0) {
      healthStat.value = '--';
      healthStat.subtitle = 'No heart rate recorded';
      return;
    }

    const latestVital = vitals.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    const heartRate = latestVital?.heartRateBpm;

    if (heartRate === undefined || heartRate === null) {
      healthStat.value = '--';
      healthStat.subtitle = 'No heart rate recorded';
      return;
    }

    healthStat.value = `${heartRate} bpm`;
    healthStat.subtitle = `Recorded ${this.formatShortDate(new Date(latestVital.recordedAt))}`;
    healthStat.iconColor = '#28A745';
  }

  private getStat(title: string): StatCard | undefined {
    return this.stats.find(stat => stat.title === title);
  }

  private parseDateOnly(input: string): Date {
    if (!input) return new Date(NaN);
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
    if (match) {
      const [, y, m, d] = match;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    return new Date(input);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  formatShortDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  viewAllDocuments(): void {
    this.router.navigate(['/medical-records']);
  }

  viewDocument(docId: string): void {
    this.router.navigate(['/medical-records', docId]);
  }

  downloadDocument(docId: string, event: Event): void {
    event.stopPropagation();
    console.log('Downloading document:', docId);
    // TODO: Implement download functionality
    alert('Download feature coming soon!');
  }

  showMoreOptions(docId: string, event: Event): void {
    event.stopPropagation();
    console.log('More options for:', docId);
    // TODO: Implement more options menu
  }

  scheduleAppointment(): void {
    this.router.navigate(['/findDoctors']);
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
  

}
