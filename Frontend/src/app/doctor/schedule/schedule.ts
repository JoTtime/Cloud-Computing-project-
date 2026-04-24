import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SharedHeader } from '../../features/shared-header/shared-header';
import { RouterLink } from "@angular/router";
import { AppointmentService, Appointment } from '../../services/appointment.service';
import { BillingService, Invoice } from '../../services/billing.service';
import { PatientProfileService, PatientProfile } from '../../services/patient-profile';
import { ConnectionService } from '../../services/connection';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

interface AppointmentDisplay {
  time: string;
  patient: string;
  type: string;
  duration: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  mode: 'In-Person' | 'Teleconsult';
  appointmentId: string;
  patientId: string;
  date: Date;
  reason: string;
  invoiceAmountFcfa?: number;
  invoiceNumber?: string;
}

interface WeeklyStat {
  day: string;
  date: string;
  count: number;
  fullDate: Date;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, SharedHeader, RouterLink],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule {

  doctorName: string = '';
  currentDate: Date = new Date();
  selectedDate: Date = new Date();
  appointments: AppointmentDisplay[] = [];
  weeklyStats: WeeklyStat[] = [];
  
  // Stats
  todayTotal: number = 0;
  inPersonCount: number = 0;
  teleconsultCount: number = 0;
  
  isLoading: boolean = false;
  generatingInvoiceId: string | null = null;
  private invoicesByAppointment = new Map<string, Invoice>();
  private patientsById = new Map<string, PatientProfile>();
  private patientNamesById = new Map<string, string>();

  constructor(
    private appointmentService: AppointmentService,
    private billingService: BillingService,
    private patientProfileService: PatientProfileService,
    private connectionService: ConnectionService
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadConnectedPatientNames();
    this.loadAppointmentsForDate(this.selectedDate);
    this.generateWeeklyStats();
  }

  loadUserInfo(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.doctorName = `Dr. ${user.firstName} ${user.lastName}`;
      console.log('👨‍⚕️ Doctor loaded:', this.doctorName);
    }
  }

  loadAppointmentsForDate(date: Date): void {
    this.isLoading = true;
    const dateString = this.formatDateForAPI(date);
    
    console.log('📅 Loading appointments for date:', dateString);
    console.log('📅 Selected date object:', this.selectedDate);

    this.appointmentService.getDoctorAppointments(undefined, dateString).subscribe({
      next: (response) => {
        console.log('📦 Raw API response:', response);
        
        if (response.success && response.appointments) {
          const appointments = response.appointments;
          console.log('✅ Appointments received:', response.appointments.length);
          console.log('📋 First appointment sample:', response.appointments[0]);
          
          this.resolvePatients(appointments).subscribe({
            next: () => {
              const transformed = this.transformAppointments(appointments);
              this.loadInvoices(transformed);
            },
            error: () => {
              const transformed = this.transformAppointments(appointments);
              this.loadInvoices(transformed);
            }
          });
        } else {
          console.log('⚠️ No appointments in response');
          this.appointments = [];
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('❌ Error loading appointments:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error body:', error.error);
        this.appointments = [];
        this.isLoading = false;
      }
    });
  }

  transformAppointments(appointments: Appointment[]): AppointmentDisplay[] {
    console.log('🔄 Transforming appointments:', appointments.length);
    
    const transformed = appointments
      .map((apt, index) => {
        console.log(`\n📝 Processing appointment ${index + 1}:`, {
          id: apt._id,
          status: apt.status,
          patient: apt.patient,
          type: apt.type,
          date: apt.date,
          startTime: apt.startTime,
          endTime: apt.endTime
        });

        // Handle patient data - could be populated object or just an ID
        const patientId = this.extractPatientId(apt.patient);
        const patientName = this.resolvePatientName(apt.patient, patientId);

        const display: AppointmentDisplay = {
          time: apt.startTime,
          patient: patientName,
          type: apt.reason || 'Consultation',
          duration: this.calculateDuration(apt.startTime, apt.endTime),
          status: this.mapStatus(apt.status),
          mode: apt.type === 'in-person' ? 'In-Person' : 'Teleconsult',
          appointmentId: apt._id,
          patientId: patientId,
          date: new Date(apt.date),
          reason: apt.reason || 'Consultation'
        };

        const invoice = this.invoicesByAppointment.get(apt._id);
        if (invoice) {
          display.invoiceAmountFcfa = invoice.amount;
          display.invoiceNumber = invoice.invoiceNumber;
        }

        console.log('✓ Transformed to:', display);
        return display;
      })
      .filter(apt => {
        // Only show confirmed and pending appointments
        const shouldShow = apt.status === 'Confirmed' || apt.status === 'Pending';
        if (!shouldShow) {
          console.log('❌ Filtering out appointment with status:', apt.status);
        }
        return shouldShow;
      })
      .sort((a, b) => this.compareTime(a.time, b.time));

    console.log(`✅ Final transformed appointments: ${transformed.length}`);
    return transformed;
  }

  private extractPatientId(rawPatient: any): string {
    if (!rawPatient) return '';
    if (typeof rawPatient === 'string') return rawPatient;
    return rawPatient._id || rawPatient.id || rawPatient.userId || '';
  }

  private resolvePatientName(rawPatient: any, patientId: string): string {
    if (rawPatient && typeof rawPatient === 'object') {
      const directName = `${rawPatient.firstName || ''} ${rawPatient.lastName || ''}`.trim();
      if (directName) return directName;
    }

    if (patientId && this.patientNamesById.has(patientId)) {
      const connectedName = this.patientNamesById.get(patientId);
      if (connectedName && connectedName.trim()) {
        return connectedName.trim();
      }
    }

    if (patientId && this.patientsById.has(patientId)) {
      const patient = this.patientsById.get(patientId)!;
      const profileName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
      if (profileName && profileName.toLowerCase() !== 'patient user') return profileName;
    }

    return 'Unknown Patient';
  }

  private loadConnectedPatientNames(): void {
    this.connectionService.getDoctorConnections().subscribe({
      next: (response) => {
        if (!response.success || !response.connections) return;

        response.connections.forEach(conn => {
          const rawPatient = conn?.patient as any;
          if (!rawPatient) return;

          const patientId = rawPatient._id || rawPatient.id || rawPatient.userId;
          const patientName = `${rawPatient.firstName || ''} ${rawPatient.lastName || ''}`.trim();

          if (patientId && patientName) {
            this.patientNamesById.set(patientId, patientName);
          }
        });
      },
      error: () => {
        // Keep schedule functional even if connection fetch fails.
      }
    });
  }

  private resolvePatients(appointments: Appointment[]): Observable<void> {
    const patientIds = Array.from(new Set(
      appointments.map(apt => this.extractPatientId(apt.patient)).filter(Boolean)
    ));

    if (patientIds.length === 0) {
      return of(void 0);
    }

    const lookups = patientIds.map(patientId =>
      this.patientProfileService.getPatientById(patientId).pipe(
        map(response => ({ patientId, patient: response.patient })),
        catchError(() => of({ patientId, patient: null }))
      )
    );

    return forkJoin(lookups).pipe(
      map(results => {
        results.forEach(({ patientId, patient }) => {
          if (patient) {
            this.patientsById.set(patientId, patient);
          }
        });
        return void 0;
      })
    );
  }

  private loadInvoices(transformedAppointments: AppointmentDisplay[]): void {
    this.billingService.getMyInvoices().subscribe({
      next: (result) => {
        this.invoicesByAppointment.clear();
        (result.invoices ?? []).forEach(invoice => {
          this.invoicesByAppointment.set(invoice.appointmentId, invoice);
        });
        this.appointments = transformedAppointments.map(appt => {
          const invoice = this.invoicesByAppointment.get(appt.appointmentId);
          return {
            ...appt,
            invoiceAmountFcfa: invoice?.amount,
            invoiceNumber: invoice?.invoiceNumber
          };
        });
        this.calculateStats();
        this.isLoading = false;
      },
      error: () => {
        this.appointments = transformedAppointments;
        this.calculateStats();
        this.isLoading = false;
      }
    });
  }

  generateInvoice(appointmentId: string): void {
    if (this.generatingInvoiceId) return;
    this.generatingInvoiceId = appointmentId;
    this.billingService.generateInvoice(appointmentId).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadAppointmentsForDate(this.selectedDate);
        }
      },
      error: (error) => {
        console.error('❌ Error generating invoice:', error);
        const serverMsg =
          error?.error?.message ||
          error?.error?.error ||
          (typeof error?.error === 'string' ? error.error : null);
        const hint =
          error?.status === 400 || error?.status === 502 || error?.status === 503
            ? ''
            : ' If this persists, confirm appointment (8087) and doctor (8088) services are running, and set a consultation fee in doctor account settings.';
        alert(
          (serverMsg ? String(serverMsg) : 'Unable to generate invoice.') + hint
        );
        this.generatingInvoiceId = null;
      },
      complete: () => {
        this.generatingInvoiceId = null;
      }
    });
  }

  calculateDuration(start: string, end: string): string {
    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);
    const duration = endMinutes - startMinutes;
    return `${duration} min`;
  }

  timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  compareTime(time1: string, time2: string): number {
    return this.timeToMinutes(time1) - this.timeToMinutes(time2);
  }

  mapStatus(status: string): 'Confirmed' | 'Pending' | 'Cancelled' {
    const mapped = status.toLowerCase();
    if (mapped === 'confirmed') return 'Confirmed';
    if (mapped === 'pending') return 'Pending';
    return 'Cancelled';
  }

  calculateStats(): void {
    this.todayTotal = this.appointments.length;
    this.inPersonCount = this.appointments.filter(apt => apt.mode === 'In-Person').length;
    this.teleconsultCount = this.appointments.filter(apt => apt.mode === 'Teleconsult').length;
    
    console.log('📊 Stats calculated:', {
      total: this.todayTotal,
      inPerson: this.inPersonCount,
      teleconsult: this.teleconsultCount
    });
  }

  generateWeeklyStats(): void {
    const today = new Date(this.currentDate);
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));

    this.weeklyStats = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      
      this.weeklyStats.push({
        day: dayNames[i],
        date: this.formatDateShort(date),
        count: 0,
        fullDate: new Date(date)
      });
    }

    console.log('📅 Weekly stats generated:', this.weeklyStats);
    
    // Load counts for each day
    this.loadWeeklyCounts();
  }

  loadWeeklyCounts(): void {
    this.weeklyStats.forEach((stat, index) => {
      const dateString = this.formatDateForAPI(stat.fullDate);
      
      this.appointmentService.getDoctorAppointments(undefined, dateString).subscribe({
        next: (response) => {
          if (response.success && response.appointments) {
            const validAppointments = response.appointments.filter(
              apt => apt.status === 'confirmed' || apt.status === 'pending'
            );
            this.weeklyStats[index].count = validAppointments.length;
            console.log(`✓ ${stat.day} (${dateString}): ${validAppointments.length} appointments`);
          }
        },
        error: (error) => {
          console.error(`❌ Error loading count for ${stat.day}:`, error);
        }
      });
    });
  }

  // Navigation
  previousDay(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() - 1);
    this.selectedDate = new Date(this.selectedDate);
    console.log('⬅️ Previous day:', this.formatDateForAPI(this.selectedDate));
    this.loadAppointmentsForDate(this.selectedDate);
  }

  nextDay(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() + 1);
    this.selectedDate = new Date(this.selectedDate);
    console.log('➡️ Next day:', this.formatDateForAPI(this.selectedDate));
    this.loadAppointmentsForDate(this.selectedDate);
  }

  goToToday(): void {
    this.selectedDate = new Date();
    console.log('📅 Go to today:', this.formatDateForAPI(this.selectedDate));
    this.loadAppointmentsForDate(this.selectedDate);
  }

  // Formatting helpers
  formatDateForAPI(date: Date): string {
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDateShort(date: Date): string {
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  }

  getFormattedCurrentDate(): string {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return this.selectedDate.toLocaleDateString('en-US', options);
  }

  getAppointmentCountText(): string {
    const count = this.appointments.length;
    return `${count} appointment${count !== 1 ? 's' : ''} scheduled`;
  }

}
