import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SharedHeader } from '../../features/shared-header/shared-header';
import { RouterLink } from "@angular/router";
import { FormsModule } from '@angular/forms';
import { AppointmentService, Appointment } from '../../services/appointment.service';
import { BillingService } from '../../services/billing.service';

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
  imports: [CommonModule, SharedHeader, RouterLink, FormsModule],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule implements OnInit {

  doctorName: string = '';
  doctorId: string = '';
  currentDate: Date = new Date();
  selectedDate: Date = new Date();
  appointments: AppointmentDisplay[] = [];
  pendingRequests: AppointmentDisplay[] = [];
  weeklyStats: WeeklyStat[] = [];
  
  // Stats
  todayTotal: number = 0;
  inPersonCount: number = 0;
  teleconsultCount: number = 0;
  actionLoadingId: string | null = null;
  
  isLoading: boolean = false;

  // Invoice modal
  showInvoiceModal = false;
  selectedAppointment: AppointmentDisplay | null = null;
  invoiceForm = {
    amount: 50,
    description: '',
    notes: ''
  };
  creatingInvoice = false;

  constructor(
    private appointmentService: AppointmentService,
    private billingService: BillingService
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadAppointmentsForDate(this.selectedDate);
    this.generateWeeklyStats();
  }

  loadUserInfo(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.doctorName = `Dr. ${user.firstName} ${user.lastName}`;
      this.doctorId = user.userId || user.id || user._id || '';
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
          console.log('✅ Appointments received:', response.appointments.length);
          console.log('📋 First appointment sample:', response.appointments[0]);
          
          const transformed = this.transformAppointments(response.appointments);
          this.pendingRequests = transformed.filter(apt => apt.status === 'Pending');
          this.appointments = transformed.filter(apt => apt.status === 'Confirmed');
          
          console.log('✅ Transformed appointments:', this.appointments.length);
          console.log('📊 Appointments list:', this.appointments);
          
          this.calculateStats();
        } else {
          console.log('⚠️ No appointments in response');
          this.appointments = [];
        }
        this.isLoading = false;
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
        let patientFirstName = 'Unknown';
        let patientLastName = 'Patient';
        let patientId = '';

        if (typeof apt.patient === 'string') {
          console.log('⚠️ Patient is just an ID:', apt.patient);
          patientId = apt.patient;
        } else if (apt.patient && typeof apt.patient === 'object') {
          patientFirstName = apt.patient.firstName || 'Unknown';
          patientLastName = apt.patient.lastName || 'Patient';
          patientId = apt.patient._id || apt.patient.id || '';
          console.log('✓ Patient populated:', patientFirstName, patientLastName);
        }

        const display: AppointmentDisplay = {
          time: apt.startTime,
          patient: `${patientFirstName} ${patientLastName}`,
          type: apt.reason || 'Consultation',
          duration: this.calculateDuration(apt.startTime, apt.endTime),
          status: this.mapStatus(apt.status),
          mode: apt.type === 'in-person' ? 'In-Person' : 'Teleconsult',
          appointmentId: apt._id,
          patientId: patientId,
          date: new Date(apt.date),
          reason: apt.reason || 'Consultation'
        };

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
    const allToday = [...this.appointments, ...this.pendingRequests];
    this.todayTotal = allToday.length;
    this.inPersonCount = allToday.filter(apt => apt.mode === 'In-Person').length;
    this.teleconsultCount = allToday.filter(apt => apt.mode === 'Teleconsult').length;
    
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
    const count = this.appointments.length + this.pendingRequests.length;
    return `${count} appointment${count !== 1 ? 's' : ''} scheduled`;
  }

  handleAppointmentRequest(appt: AppointmentDisplay, action: 'accept' | 'reject'): void {
    let rejectionReason = '';
    if (action === 'reject') {
      rejectionReason = prompt('Please provide a reason for declining (optional):') || '';
    }

    this.actionLoadingId = appt.appointmentId;
    this.appointmentService.respondToAppointment(appt.appointmentId, action, rejectionReason).subscribe({
      next: (response) => {
        if (response.success) {
          if (action === 'accept') {
            this.createInvoiceAfterAcceptance(appt);
          } else {
            alert(`Appointment ${action}ed successfully.`);
            this.loadAppointmentsForDate(this.selectedDate);
            this.loadWeeklyCounts();
          }
        }
        this.actionLoadingId = null;
      },
      error: (error) => {
        console.error(`❌ Failed to ${action} appointment:`, error);
        alert(`Failed to ${action} appointment. Please try again.`);
        this.actionLoadingId = null;
      }
    });
  }

  private createInvoiceAfterAcceptance(appt: AppointmentDisplay): void {
    this.billingService.createInvoice({
      patientId: appt.patientId,
      patientName: appt.patient,
      doctorName: this.doctorName,
      appointmentId: appt.appointmentId,
      consultationType: appt.mode === 'In-Person' ? 'in-person' : 'video',
      description: `Consultation - ${appt.reason}`,
      amount: 50,
      notes: 'Auto-generated after appointment confirmation'
    }).subscribe({
      next: (res) => {
        if (res.success) {
          alert('Appointment accepted and invoice generated successfully.');
        } else {
          alert('Appointment accepted, but invoice was not generated.');
        }
        this.loadAppointmentsForDate(this.selectedDate);
        this.loadWeeklyCounts();
      },
      error: (error) => {
        console.error('❌ Invoice creation failed after acceptance:', error);
        alert('Appointment accepted, but billing invoice creation failed.');
        this.loadAppointmentsForDate(this.selectedDate);
        this.loadWeeklyCounts();
      }
    });
  }

  openInvoiceModal(appt: AppointmentDisplay): void {
    this.selectedAppointment = appt;
    this.invoiceForm = {
      amount: 50,
      description: `Consultation - ${appt.reason}`,
      notes: ''
    };
    this.showInvoiceModal = true;
  }

  closeInvoiceModal(): void {
    this.showInvoiceModal = false;
    this.selectedAppointment = null;
    this.creatingInvoice = false;
  }

  submitInvoice(): void {
    if (!this.selectedAppointment || this.creatingInvoice) return;
    this.creatingInvoice = true;

    this.billingService.createInvoice({
      patientId: this.selectedAppointment.patientId,
      patientName: this.selectedAppointment.patient,
      doctorName: this.doctorName,
      appointmentId: this.selectedAppointment.appointmentId,
      description: this.invoiceForm.description,
      amount: this.invoiceForm.amount,
      notes: this.invoiceForm.notes
    }).subscribe({
      next: (res) => {
        if (res.success) {
          alert('Invoice created successfully. The patient will be notified.');
          this.closeInvoiceModal();
        }
        this.creatingInvoice = false;
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to create invoice.');
        this.creatingInvoice = false;
      }
    });
  }

}
