import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AdminService, Patient } from '../../services/admin.service';

@Component({
  selector: 'app-admin-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './patients.html',
  styleUrls: ['./patients.css']
})
export class AdminPatients implements OnInit {
  // Data
  allPatients: Patient[] = [];
  filteredPatients: Patient[] = [];
  
  // UI state
  loading = true;
  error = '';
  searchTerm = '';
  statusFilter = 'all';
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Invite modal
  showInviteModal = false;
  inviteEmail = '';
  sendingInvite = false;

  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading = true;
    this.error = '';
    this.adminService.getAllPatients().subscribe({
      next: (res) => {
        if (res.success && res.patients) {
          this.allPatients = res.patients;
          this.applyFilters();
        } else {
          this.error = 'Failed to load patients. Please try again.';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Unable to connect to server. Please check your connection.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.allPatients];
    
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === this.statusFilter);
    }
    
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term) ||
        p.patientId.toLowerCase().includes(term)
      );
    }
    
    this.filteredPatients = filtered;
    this.totalPages = Math.ceil(this.filteredPatients.length / this.pageSize);
    this.currentPage = 1;
  }

  onSearch(): void { this.applyFilters(); }
  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  get paginatedPatients(): Patient[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredPatients.slice(start, start + this.pageSize);
  }

  previousPage(): void { if (this.currentPage > 1) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }

  viewPatient(id: string): void {
    this.router.navigate(['/admin/patients', id]);
  }

  deletePatient(id: string): void {
    if (confirm('Are you sure you want to delete this patient? This action cannot be undone.')) {
      this.adminService.deletePatient(id).subscribe({
        next: (res) => {
          if (res.success) this.loadPatients();
          else alert('Failed to delete patient.');
        },
        error: (err) => {
          console.error(err);
          alert('Error deleting patient.');
        }
      });
    }
  }

  // Invite methods
  invitePatient(): void {
    this.showInviteModal = true;
    this.inviteEmail = '';
    this.sendingInvite = false;
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
  }

  sendInvitation(): void {
    if (!this.inviteEmail || !this.inviteEmail.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    this.sendingInvite = true;
    this.adminService.invitePatient(this.inviteEmail).subscribe({
      next: (res) => {
        if (res.success) {
          alert('Invitation sent successfully!');
          this.closeInviteModal();
          this.loadPatients(); // refresh list (pending patient may appear)
        } else {
          alert(res.message || 'Failed to send invitation.');
        }
        this.sendingInvite = false;
      },
      error: (err) => {
        console.error(err);
        alert('Error sending invitation. Please try again.');
        this.sendingInvite = false;
      }
    });
  }
}