import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SharedHeader } from '../../features/shared-header/shared-header';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, map, of } from 'rxjs';
import { MessageService } from '../../services/message';
import { ConnectionService } from '../../services/connection';
import { AppointmentService, Appointment as AppointmentModel } from '../../services/appointment.service';
import { BillingService, Invoice } from '../../services/billing.service';
import { DoctorService } from '../../services/doctor';


interface Appointmentattributes {
  id: string;
  doctorId?: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'rejected';
  type: 'in-person' | 'video';
  imageUrl: string;
  connectionId?: string;
  reason?: string;
  rawDate?: Date;
  invoiceNumber?: string;
  invoiceAmountFcfa?: number;
}

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [CommonModule, SharedHeader, FormsModule],
  templateUrl: './appointment.html',
  styleUrl: './appointment.css',
})
export class Appointment implements OnInit{
 userName: string = '';
  activeTab: 'upcoming' | 'past' = 'upcoming';
  
  appointments: Appointmentattributes[] = [];
  filteredAppointments: Appointmentattributes[] = [];
  selectedAppointment: Appointmentattributes | null = null;
  
  showCancelModal: boolean = false;
  showMessageModal: boolean = false;
  
  messageText: string = '';
  isLoading: boolean = false;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private connectionService: ConnectionService,
    private appointmentService: AppointmentService,
    private billingService: BillingService,
    private doctorService: DoctorService
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadAppointmentsAndConnections();
  }

  loadUserInfo(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userName = `${user.firstName} ${user.lastName}`;
    }
  }

  // FIX 1: Load appointments and connections together
  loadAppointmentsAndConnections(): void {
    this.isLoading = true;
    
    // Use forkJoin to wait for both requests to complete
    forkJoin({
      appointments: this.appointmentService.getPatientAppointments(),
      connections: this.connectionService.getPatientConnections()
    }).subscribe({
      next: ({ appointments, connections }) => {
        console.log('📦 Loaded appointments:', appointments);
        console.log('🔗 Loaded connections:', connections);

        // Build connection map first
        const connectionMap = new Map<string, string>();
        const connectedDoctorDirectory = new Map<string, { firstName: string; lastName: string; specialty: string }>();
        if (connections.success && connections.connections) {
          connections.connections.forEach(conn => {
            if (conn.status === 'accepted') {
              // Extract doctor ID - handle both populated and non-populated cases
              const doctorId = typeof conn.doctor === 'string' 
                ? conn.doctor 
                : conn.doctor._id || conn.doctor.id;
              
              connectionMap.set(doctorId, conn._id);
              if (typeof conn.doctor === 'object' && conn.doctor) {
                connectedDoctorDirectory.set(doctorId, {
                  firstName: conn.doctor.firstName || '',
                  lastName: conn.doctor.lastName || '',
                  specialty: conn.doctor.specialty || 'General Practice'
                });
              }
              console.log(`📍 Mapped doctor ${doctorId} to connection ${conn._id}`);
            }
          });
        }

        // Transform appointments with connection IDs
        const invoiceMap = new Map<string, Invoice>();
        this.billingService.getMyInvoices().subscribe({
          next: (billing) => {
            (billing.invoices ?? []).forEach(invoice => invoiceMap.set(invoice.appointmentId, invoice));
            this.applyAppointments(appointments, connectionMap, connectedDoctorDirectory, invoiceMap);
          },
          error: () => {
            this.applyAppointments(appointments, connectionMap, connectedDoctorDirectory, invoiceMap);
          }
        });
      },
      error: (error) => {
        console.error('❌ Error loading data:', error);
        this.isLoading = false;
        this.filterAppointments();
      }
    });
  }

  private applyAppointments(
    appointments: any,
    connectionMap: Map<string, string>,
    connectedDoctorDirectory: Map<string, { firstName: string; lastName: string; specialty: string }>,
    invoiceMap: Map<string, Invoice>
  ): void {
    if (!appointments.success || !appointments.appointments) {
      this.filterAppointments();
      this.isLoading = false;
      return;
    }

    const appointmentList: AppointmentModel[] = appointments.appointments;
    const doctorIdsToResolve = Array.from(new Set(
      appointmentList
        .map((apt) => (typeof apt.doctor === 'string' ? apt.doctor : apt.doctor?._id || apt.doctor?.id || ''))
        .filter(Boolean)
    ));

    this.resolveDoctorDirectory(doctorIdsToResolve).subscribe({
      next: (doctorDirectory) => {
        this.appointments = appointmentList.map((apt: AppointmentModel) => {
          const doctorId = typeof apt.doctor === 'string'
            ? apt.doctor
            : apt.doctor?._id || apt.doctor?.id || '';
          const resolvedDoctor = doctorDirectory.get(doctorId);
          const connectedDoctor = connectedDoctorDirectory.get(doctorId);

          const doctorFirstName = (typeof apt.doctor === 'object' ? apt.doctor?.firstName : undefined)
            || connectedDoctor?.firstName
            || resolvedDoctor?.firstName
            || 'Doctor';
          const doctorLastName = (typeof apt.doctor === 'object' ? apt.doctor?.lastName : undefined)
            || connectedDoctor?.lastName
            || resolvedDoctor?.lastName
            || '';
          const specialty = (typeof apt.doctor === 'object' ? apt.doctor?.specialty : undefined)
            || connectedDoctor?.specialty
            || resolvedDoctor?.specialty
            || 'General Practice';

          const connectionId = connectionMap.get(doctorId);
          const invoice = invoiceMap.get(apt._id);

          return {
            id: apt._id,
            doctorId: doctorId,
            doctorName: `Dr. ${doctorFirstName} ${doctorLastName}`.trim(),
            specialty: specialty,
            date: this.formatDate(apt.date),
            time: apt.startTime,
            location: apt.location || 'Video Call',
            status: apt.status,
            type: apt.type,
            imageUrl: '',
            reason: apt.reason,
            rawDate: new Date(apt.date),
            connectionId: connectionId,
            invoiceNumber: invoice?.invoiceNumber,
            invoiceAmountFcfa: invoice?.amount
          };
        });

        this.filterAppointments();
        this.isLoading = false;
      },
      error: () => {
        this.filterAppointments();
        this.isLoading = false;
      }
    });
  }

  private resolveDoctorDirectory(doctorIds: string[]) {
    if (doctorIds.length === 0) {
      return of(new Map<string, { firstName: string; lastName: string; specialty: string }>());
    }

    const requests = doctorIds.map((doctorId) =>
      this.doctorService.getDoctorById(doctorId).pipe(
        map((response) => ({
          doctorId,
          doctor: response.doctor
            ? {
                firstName: response.doctor.firstName || '',
                lastName: response.doctor.lastName || '',
                specialty: response.doctor.specialty || 'General Practice'
              }
            : null
        })),
        catchError(() => of({ doctorId, doctor: null }))
      )
    );

    return forkJoin(requests).pipe(
      map((results) => {
        const directory = new Map<string, { firstName: string; lastName: string; specialty: string }>();
        results.forEach((result) => {
          if (result.doctor) {
            directory.set(result.doctorId, result.doctor);
          }
        });
        return directory;
      })
    );
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  }

  switchTab(tab: 'upcoming' | 'past'): void {
    this.activeTab = tab;
    this.filterAppointments();
  }

  filterAppointments(): void {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    console.log('🔍 Filtering appointments. Current date:', now);
    console.log('📊 Total appointments:', this.appointments.length);
    
    if (this.activeTab === 'upcoming') {
      this.filteredAppointments = this.appointments.filter(apt => {
        if (!apt.rawDate) {
          console.warn('⚠️ Appointment missing rawDate:', apt);
          return false;
        }
        
        const aptDate = new Date(apt.rawDate);
        aptDate.setHours(0, 0, 0, 0);
        
        const isUpcoming = aptDate >= now && 
          apt.status !== 'cancelled' && 
          apt.status !== 'completed' &&
          apt.status !== 'rejected';
          
        console.log(`${apt.doctorName} on ${apt.date}: upcoming=${isUpcoming}, status=${apt.status}, connectionId=${apt.connectionId}`);
        return isUpcoming;
      });
    } else {
      this.filteredAppointments = this.appointments.filter(apt => {
        if (!apt.rawDate) {
          console.warn('⚠️ Appointment missing rawDate:', apt);
          return false;
        }
        
        const aptDate = new Date(apt.rawDate);
        aptDate.setHours(0, 0, 0, 0);
        
        const isPast = aptDate < now || 
          apt.status === 'completed' || 
          apt.status === 'cancelled' ||
          apt.status === 'rejected';
          
        console.log(`${apt.doctorName} on ${apt.date}: past=${isPast}, status=${apt.status}`);
        return isPast;
      });
    }
    
    console.log(`✅ Filtered ${this.filteredAppointments.length} ${this.activeTab} appointments`);
  }

  openCancelModal(appointment: Appointmentattributes): void {
    this.selectedAppointment = appointment;
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.selectedAppointment = null;
  }

  confirmCancel(): void {
    if (!this.selectedAppointment) return;

    const reason = prompt('Please provide a reason for cancellation (optional):') || '';

    this.appointmentService.cancelAppointment(this.selectedAppointment.id, reason).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Appointment cancelled successfully');
          this.loadAppointmentsAndConnections();
          this.closeCancelModal();
        }
      },
      error: (error) => {
        console.error('❌ Error cancelling appointment:', error);
        alert('Failed to cancel appointment. Please try again.');
      }
    });
  }

  openMessageModal(appointment: Appointmentattributes): void {
    console.log('💬 Opening message modal for:', appointment);
    console.log('🔑 Connection ID:', appointment.connectionId);
    
    if (!appointment.connectionId) {
      alert('Connection not found. Unable to send message to this doctor.');
      console.error('❌ No connectionId for appointment:', appointment);
      return;
    }

    this.selectedAppointment = appointment;
    this.messageText = '';
    this.showMessageModal = true;
  }

  closeMessageModal(): void {
    this.showMessageModal = false;
    this.selectedAppointment = null;
    this.messageText = '';
  }

  sendMessage(): void {
    if (!this.messageText.trim() || !this.selectedAppointment || !this.selectedAppointment.connectionId) {
      console.warn('⚠️ Cannot send message: missing text or connection');
      return;
    }

    console.log('📤 Sending message to connectionId:', this.selectedAppointment.connectionId);

    this.messageService.sendMessage(
      this.selectedAppointment.connectionId,
      this.messageText.trim()
    ).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Message sent successfully');
          alert('Message sent successfully!');
          this.closeMessageModal();
        }
      },
      error: (error) => {
        console.error('❌ Error sending message:', error);
        console.error('Error details:', {
          status: error.status,
          message: error.error?.message || error.message,
          error: error.error
        });
        alert(`Failed to send message: ${error.error?.message || 'Please try again.'}`);
      }
    });
  }

  joinVideoCall(appointment: Appointmentattributes): void {
    console.log('📹 Joining video call:', appointment.id);
    alert('Video call feature coming soon!');
  }

  logout(): void {
    this.router.navigate(['login']);
  }
}
