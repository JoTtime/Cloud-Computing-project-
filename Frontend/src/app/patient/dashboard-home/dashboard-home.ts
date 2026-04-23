// dashboard-home.component.ts – Fully dynamic, no mock data
import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { UploadDoc, DocumentResponse } from '../../services/upload-doc';
import { ConnectionService } from '../../services/connection';
import { AppointmentService, Appointment as AppointmentModel } from '../../services/appointment.service';
import { PatientProfileService } from '../../services/patient-profile';
import { NotificationService } from '../../services/notification';
// Import billing service if available – optional; if not, we skip revenue
// import { BillingService } from '../../services/billing';

interface AdminStatCard {
  title: string;
  value: string | number;
  trend: string;
  trendUp: boolean;
  iconType: string;
  iconColor: string;
  bgColor: string;
}

interface DocumentItem {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  date: string;
}

interface ActivityItem {
  iconType: string;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  timeAgo: string;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DatePipe, UpperCasePipe],
  templateUrl: './dashboard-home.html',
  styleUrls: ['./dashboard-home.css']
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  @ViewChild('fileUpload') fileUpload!: ElementRef<HTMLInputElement>;

  userName: string = '';
  loading: boolean = true;
  today: Date = new Date();
  totalDocumentsCount: number = 0;
  upcomingAppointmentsCount: number = 0;

  // Stats – will be populated from real data
  adminStats: AdminStatCard[] = [
    { title: 'PATIENTS', value: 0, trend: 'Loading...', trendUp: true, iconType: 'users', iconColor: '#0369a1', bgColor: 'rgba(3,105,161,0.08)' },
    { title: 'APPOINTMENTS', value: 0, trend: 'Loading...', trendUp: true, iconType: 'calendar', iconColor: '#0891b2', bgColor: 'rgba(8,145,178,0.08)' },
    { title: 'ACTIVE DOCTORS', value: 0, trend: 'Loading...', trendUp: true, iconType: 'doctors', iconColor: '#7c3aed', bgColor: 'rgba(124,58,237,0.08)' },
    { title: 'REVENUE', value: '$--', trend: 'Loading...', trendUp: false, iconType: 'revenue', iconColor: '#16a34a', bgColor: 'rgba(22,163,74,0.08)' }
  ];

  recentDocuments: DocumentItem[] = [];
  recentActivities: ActivityItem[] = [];

  private notificationRealtimeSubscription?: Subscription;

  private categoryColors: Record<string, string> = {
    'lab_results': '#0369a1',
    'imaging': '#0891b2',
    'prescription': '#ea580c',
    'clinical_notes': '#7c3aed',
    'vaccination_records': '#16a34a',
    'others': '#6b8090'
  };
  private categoryLabels: Record<string, string> = {
    'lab_results': 'Lab Results',
    'imaging': 'Imaging',
    'prescription': 'Prescription',
    'clinical_notes': 'Clinical Notes',
    'vaccination_records': 'Vaccination',
    'others': 'Other'
  };

  constructor(
    private router: Router,
    private uploadDocService: UploadDoc,
    private connectionService: ConnectionService,
    private appointmentService: AppointmentService,
    private patientProfileService: PatientProfileService,
    private notificationService: NotificationService
    // private billingService?: BillingService // optional
  ) {}

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  openUploadModal(): void {
    this.fileUpload.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.router.navigate(['/patient/medical-records/upload'], { state: { file } });
      input.value = '';
    }
  }

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
    this.notificationRealtimeSubscription?.unsubscribe();
  }

  loadUserData(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userName = `${user.firstName} ${user.lastName}`;
    } else {
      this.userName = 'Jeremie Tchuente';
    }
  }

  loadDashboardData(): void {
    this.loading = true;
    forkJoin({
      documents: this.uploadDocService.getMyDocuments(),
      connections: this.connectionService.getPatientConnections(),
      appointments: this.appointmentService.getPatientAppointments(),
      profile: this.patientProfileService.getMyProfile()
      // revenue: this.billingService?.getTotalRevenue() // optional
    }).subscribe({
      next: (results) => {
        // Process documents
        if (results.documents) {
          this.processDocuments(results.documents);
        } else {
          this.totalDocumentsCount = 0;
          this.recentDocuments = [];
        }

        // Process appointments
        let appointmentsList: AppointmentModel[] = [];
        if (results.appointments.success) {
          appointmentsList = results.appointments.appointments || [];
          this.processAppointments(appointmentsList);
        } else {
          this.upcomingAppointmentsCount = 0;
          this.adminStats[1].value = 0;
          this.adminStats[1].trend = 'No appointments';
        }

        // Process connections (update patients & active doctors counts)
        let totalConnections = 0;
        let acceptedDoctors = 0;
        if (results.connections.success && results.connections.connections) {
          const connections = results.connections.connections;
          totalConnections = connections.length;
          acceptedDoctors = connections.filter((c: any) => c.status === 'accepted').length;
          this.updateConnectionStats(totalConnections, acceptedDoctors);
        } else {
          this.updateConnectionStats(0, 0);
        }

        // Build recent activities from real documents and appointments (no mock)
        this.buildRecentActivity(results.documents || [], appointmentsList);

        // Optionally update revenue if billing service is available
        // if (results.revenue) { this.updateRevenueStat(results.revenue); }

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard data', err);
        // Set error states instead of mock data
        this.loading = false;
        this.adminStats[0].value = 'Error';
        this.adminStats[0].trend = 'Unable to load';
        this.adminStats[1].value = 'Error';
        this.adminStats[1].trend = 'Unable to load';
        this.adminStats[2].value = 'Error';
        this.adminStats[2].trend = 'Unable to load';
        this.adminStats[3].value = '$--';
        this.adminStats[3].trend = 'Unable to load';
        this.recentDocuments = [];
        this.recentActivities = [];
      }
    });
  }

  processDocuments(documents: DocumentResponse[]): void {
    this.totalDocumentsCount = documents.length;
    this.recentDocuments = [...documents]
      .sort((a, b) => new Date(b.docDate).getTime() - new Date(a.docDate).getTime())
      .slice(0, 5)
      .map(doc => ({
        id: doc._id,
        title: doc.docTitle,
        category: this.categoryLabels[doc.category] || doc.category,
        categoryColor: this.categoryColors[doc.category] || '#6b8090',
        date: this.formatDate(doc.docDate)
      }));
  }

  processAppointments(appointments: AppointmentModel[]): void {
    const now = new Date(); now.setHours(0,0,0,0);
    const upcoming = appointments.filter(a => {
      const d = new Date(a.date); d.setHours(0,0,0,0);
      return d >= now && !['cancelled','completed','rejected'].includes(a.status);
    });
    this.upcomingAppointmentsCount = upcoming.length;
    // Update stat card
    this.adminStats[1].value = appointments.length;
    this.adminStats[1].trend = this.upcomingAppointmentsCount > 0 
      ? `${this.upcomingAppointmentsCount} upcoming` 
      : 'No upcoming';
  }

  updateConnectionStats(total: number, accepted: number): void {
    this.adminStats[0].value = total;
    this.adminStats[0].trend = accepted > 0 ? `${accepted} active` : 'No connections';

    this.adminStats[2].value = accepted;
    this.adminStats[2].trend = accepted > 0 ? `${accepted} connected` : 'No doctors';
  }

  updateRevenueStat(revenue: any): void {
    // Example: revenue = { total: 48290, change: '+8.4%' }
    this.adminStats[3].value = `$${revenue.total?.toLocaleString() || '0'}`;
    this.adminStats[3].trend = revenue.change || 'No data';
    this.adminStats[3].trendUp = revenue.change?.startsWith('+') ?? false;
  }

  refreshConnectionStats(): void {
    this.connectionService.getPatientConnections().subscribe({
      next: (r) => {
        if (r.success && r.connections) {
          const connections = r.connections;
          const total = connections.length;
          const accepted = connections.filter((c: any) => c.status === 'accepted').length;
          this.updateConnectionStats(total, accepted);
        }
      },
      error: () => {}
    });
  }

  private isConnectionNotification(type?: string): boolean {
    return ['CONNECTION_REQUEST','CONNECTION_ACCEPTED','CONNECTION_REJECTED'].includes(type ?? '');
  }

  buildRecentActivity(documents: DocumentResponse[], appointments: AppointmentModel[]): void {
    const activities: ActivityItem[] = [];

    // Add document upload activities (up to 3)
    documents.slice(0, 3).forEach(doc => {
      activities.push({
        iconType: 'upload',
        iconBg: '#fff0e6',
        iconColor: '#ea580c',
        title: 'Document uploaded',
        description: `${doc.docTitle} — ${this.formatDate(doc.docDate)}`,
        timeAgo: this.getTimeAgo(new Date(doc.docDate))
      });
    });

    // Add appointment activities (up to 3)
    appointments.slice(0, 3).forEach((app: any) => {
      const doctorDisplay = app.doctorName || app.doctor?.name || `Doctor ${app.doctorId || 'ID:' + app._id}`;
      const appDate = new Date(app.date);
      activities.push({
        iconType: 'calendar_check',
        iconBg: '#e6f7ec',
        iconColor: '#16a34a',
        title: 'Appointment scheduled',
        description: `with ${doctorDisplay} on ${this.formatDate(app.date)}`,
        timeAgo: this.getTimeAgo(appDate)
      });
    });

    // Sort by most recent (timeAgo numeric value)
    this.recentActivities = activities.sort((a, b) => {
      const getRank = (t: string) => {
        if (t.includes('minute')) return 0;
        if (t.includes('hour')) return 1;
        if (t.includes('day')) return 2;
        return 3;
      };
      return getRank(a.timeAgo) - getRank(b.timeAgo);
    }).slice(0, 5); // show up to 5 activities
  }

  getTimeAgo(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  viewAllDocuments(): void {
    this.router.navigate(['/patient/medical-records']);
  }

  viewDocument(id: string): void {
    this.router.navigate(['/patient/medical-records', id]);
  }
}