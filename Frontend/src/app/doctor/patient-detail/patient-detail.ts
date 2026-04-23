import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {  Router } from '@angular/router';
import { SharedHeader } from '../../features/shared-header/shared-header';
import { FormsModule } from '@angular/forms';
import { PatientProfileService, PatientProfile } from '../../services/patient-profile';
import { ConnectionService } from '../../services/connection';
import { MessageService } from '../../services/message';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, SharedHeader, FormsModule],
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.css',
})
export class PatientDetail implements OnInit {
  activeTab: string = 'vitals';
  patientId!: string;
  patient: PatientProfile | null = null;
  loading: boolean = true;

  showMessageModal: boolean = false;
  messageText: string = '';
  attachedFile: File | null = null;
  connectionId: string | null = null;
  
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patientProfileService: PatientProfileService,
    private connectionService: ConnectionService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.patientId = this.route.snapshot.params['id'];
    console.log('👤 Patient Detail - Patient ID:', this.patientId);
    this.loadPatientData();
    this.loadConnectionId();
  }

  loadPatientData(): void {
    this.loading = true;
    console.log('📥 Loading patient data...');
    
    this.patientProfileService.getPatientById(this.patientId).subscribe({
      next: (response) => {
        if (response.success) {
          this.patient = response.patient;
          console.log('✅ Patient data loaded:', this.patient);
        } else {
          console.warn('⚠️ Patient data load failed:', response);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading patient data:', error);
        this.loading = false;
        alert('Failed to load patient data. Please try again.');
      }
    });
  }

  loadConnectionId(): void {
    console.log('🔍 Looking for connection ID for patient:', this.patientId);
    
    // Get all doctor's connections and find the one with this patient
    this.connectionService.getDoctorConnections().subscribe({
      next: (response) => {
        if (response.success && response.connections) {
          console.log('📋 Total connections:', response.connections.length);
          
          // Find the connection for this specific patient
          const connection = response.connections.find(conn => {
            const patient = conn.patient as any;
            const patientId = patient._id || patient.userId;
            
            console.log('🔍 Checking connection:', {
              connectionId: conn._id,
              patientId: patientId,
              targetPatientId: this.patientId,
              match: patientId === this.patientId
            });
            
            return patientId === this.patientId;
          });
          
          if (connection) {
            this.connectionId = connection._id;
            console.log('✅ Connection ID found:', this.connectionId);
          } else {
            console.warn('⚠️ No connection found for this patient');
            console.log('Available patient IDs:', 
              response.connections.map(c => {
                const p = c.patient as any;
                return p._id || p.userId;
              })
            );
          }
        } else {
          console.warn('⚠️ No connections in response');
        }
      },
      error: (error) => {
        console.error('❌ Error loading connection:', error);
      }
    });
  }

  get patientName(): string {
    return this.patient ? `${this.patient.firstName} ${this.patient.lastName}` : 'Patient information unavailable';
  }

  get patientAge(): number {
    if (!this.patient?.dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(this.patient.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  get hasAllergies(): boolean {
    return !!(this.patient?.allergies && this.patient.allergies.length > 0);
  }

  get hasMedications(): boolean {
    return !!(this.patient?.currentMedications && this.patient.currentMedications.length > 0);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Not provided';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.error('❌ Error formatting date:', error);
      return 'Not provided';
    }
  }

  setTab(tab: string) {
    this.activeTab = tab;
    console.log('📑 Tab changed to:', tab);
  }

  cancel(): void {
    console.log('⬅️ Navigating back to patients list');
    this.router.navigate(['doctor-patients']);
  }

  openMessageModal(): void {
    if (!this.connectionId) {
      console.error('❌ Cannot open message modal: Connection ID not found');
      alert('Connection not found. Please refresh the page and try again.');
      return;
    }
    
    console.log('💬 Opening message modal with connection:', this.connectionId);
    this.showMessageModal = true;
    this.messageText = '';
    this.attachedFile = null;
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      console.log('📎 File selected:', file.name, file.type, file.size);
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('File size exceeds 10MB limit. Please choose a smaller file.');
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Please upload PDF, JPG, PNG, DOC, or DOCX files.');
        return;
      }

      this.attachedFile = file;
      console.log('✅ File attached successfully');
    }
  }

  removeAttachment(): void {
    console.log('🗑️ Removing attachment');
    this.attachedFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  sendMessage(): void {
    // Validate inputs
    if (!this.messageText.trim() && !this.attachedFile) {
      console.warn('⚠️ Cannot send empty message');
      alert('Please enter a message or attach a file.');
      return;
    }

    if (!this.connectionId) {
      console.error('❌ Cannot send: Connection ID missing');
      alert('Connection not found. Please refresh the page and try again.');
      return;
    }

    const content = this.messageText.trim() || (this.attachedFile ? `Sent ${this.attachedFile.name}` : '');
    
    console.log('📤 Sending message:', {
      connectionId: this.connectionId,
      content: content,
      hasAttachment: !!this.attachedFile,
      attachmentName: this.attachedFile?.name
    });

    this.messageService.sendMessage(this.connectionId, content, this.attachedFile || undefined).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Message sent successfully:', response);
          alert('Message sent successfully!');
          
          // Clear inputs
          this.messageText = '';
          this.attachedFile = null;
          if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
          }
          
          // Close modal
          this.closeMessageModal();
        } else {
          console.warn('⚠️ Message send failed:', response);
          alert('Failed to send message. Please try again.');
        }
      },
      error: (error) => {
        console.error('❌ Error sending message:', error);
        console.error('Error details:', {
          status: error.status,
          message: error.message,
          error: error.error
        });
        
        let errorMessage = 'Failed to send message. ';
        if (error.error && error.error.message) {
          errorMessage += error.error.message;
        } else if (error.status === 403) {
          errorMessage += 'You do not have permission to send messages to this patient.';
        } else if (error.status === 404) {
          errorMessage += 'Connection not found.';
        } else {
          errorMessage += 'Please try again.';
        }
        
        alert(errorMessage);
      }
    });
  }

  closeMessageModal(): void {
    console.log('❌ Closing message modal');
    this.showMessageModal = false;
    this.messageText = '';
    this.attachedFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
  

}
