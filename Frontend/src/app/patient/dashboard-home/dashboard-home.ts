// dashboard-home.component.ts
import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, OnDestroy, OnInit,ViewChild, ElementRef  } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { UploadDoc, DocumentResponse } from '../../services/upload-doc';
import { ConnectionService } from '../../services/connection';
import { AppointmentService, Appointment as AppointmentModel } from '../../services/appointment.service';
import { PatientProfileService } from '../../services/patient-profile';
import { NotificationService } from '../../services/notification';

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
  templateUrl: './dashboard-home.html',  // your dashboard content HTML
  styleUrls: ['./dashboard-home.css']   // same CSS as before
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  @ViewChild('fileUpload') fileUpload!: ElementRef<HTMLInputElement>; 
  userName: string = '';
  loading: boolean = true;
  today: Date = new Date();
  totalDocumentsCount: number = 0;
  upcomingAppointmentsCount: number = 0;

  adminStats: AdminStatCard[] = [
    { title: 'PATIENTS', value: '2,481', trend: '+12.4% vs last week', trendUp: true, iconType: 'users', iconColor: '#0369a1', bgColor: 'rgba(3,105,161,0.08)' },
    { title: 'APPOINTMENTS', value: '184', trend: '+5.2% vs last week', trendUp: true, iconType: 'calendar', iconColor: '#0891b2', bgColor: 'rgba(8,145,178,0.08)' },
    { title: 'ACTIVE DOCTORS', value: '32', trend: '+2 vs last week', trendUp: true, iconType: 'doctors', iconColor: '#7c3aed', bgColor: 'rgba(124,58,237,0.08)' },
    { title: 'REVENUE', value: '$48.2k', trend: '-1.8% vs last week', trendUp: false, iconType: 'revenue', iconColor: '#16a34a', bgColor: 'rgba(22,163,74,0.08)' }
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
      // Navigate to the upload page, passing the file via state (optional)
      this.router.navigate(['/patient/medical-records/upload'], { state: { file } });
      // Reset the input so the same file can be selected again later
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
    }).subscribe({
      next: (results) => {
        if (results.documents) this.processDocuments(results.documents);
        if (results.appointments.success) this.processAppointments(results.appointments.appointments || []);
        if (results.connections.success) this.updateDoctorCount(results.connections.connections || []);
        this.buildRecentActivity(results.documents, results.appointments.appointments || []);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.adminStats = [...this.adminStats];
        this.recentActivities = this.getDemoActivities();
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
    this.adminStats[1].value = appointments.length.toString();
  }

  updateDoctorCount(connections: any[]): void {
    const acceptedDoctors = connections.filter(c => c.status === 'accepted').length;
    this.adminStats[2].value = acceptedDoctors.toString();
  }

  refreshConnectionStats(): void {
    this.connectionService.getPatientConnections().subscribe({
      next: (r) => { if (r.success) this.updateDoctorCount(r.connections || []); },
      error: () => {}
    });
  }

  private isConnectionNotification(type?: string): boolean {
    return ['CONNECTION_REQUEST','CONNECTION_ACCEPTED','CONNECTION_REJECTED'].includes(type ?? '');
  }

  buildRecentActivity(documents: DocumentResponse[], appointments: AppointmentModel[]): void {
    const activities: ActivityItem[] = [];

    documents.slice(0, 2).forEach(doc => {
      activities.push({
        iconType: 'upload',
        iconBg: '#fff0e6',
        iconColor: '#ea580c',
        title: 'Document uploaded',
        description: `${doc.docTitle} — ${this.formatDate(doc.docDate)}`,
        timeAgo: this.getTimeAgo(new Date(doc.docDate))
      });
    });

    appointments.slice(0, 2).forEach((app: any) => {
      const doctorDisplay = app.doctorName || app.doctor?.name || `Doctor ${app.doctorId || 'ID:' + app._id}` || 'a physician';
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

    if (activities.length < 3) {
      activities.push(...this.getDemoActivities());
    }

    this.recentActivities = activities.sort((a, b) => {
      const getRank = (t: string) => {
        if (t.includes('minute')) return 0;
        if (t.includes('hour')) return 1;
        if (t.includes('day')) return 2;
        return 3;
      };
      return getRank(a.timeAgo) - getRank(b.timeAgo);
    }).slice(0, 4);
  }

  getDemoActivities(): ActivityItem[] {
    return [
      { iconType: 'user_plus', iconBg: '#e0f2fe', iconColor: '#0369a1', title: 'New patient registered', description: 'Amelia Chen joined the clinic', timeAgo: '2 hours ago' },
      { iconType: 'calendar_check', iconBg: '#e6f7ec', iconColor: '#16a34a', title: 'Appointment scheduled', description: 'You booked with Dr. Rivera on May 12', timeAgo: 'Yesterday' },
      { iconType: 'message', iconBg: '#ede9fe', iconColor: '#7c3aed', title: 'Message from Dr. Patel', description: 'Prescription renewal ready', timeAgo: '3 days ago' }
    ];
  }

  getTimeAgo(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  viewAllDocuments(): void {
    this.router.navigate(['/medical-records']);
  }

  viewDocument(id: string): void {
    this.router.navigate(['/medical-records', id]);
  }
}