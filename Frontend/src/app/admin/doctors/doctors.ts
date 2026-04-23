import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AdminService, Doctor } from '../../services/admin.service';

@Component({
  selector: 'app-admin-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './doctors.html',
  styleUrls: ['./doctors.css']
})
export class AdminDoctors implements OnInit {
  // Data
  allDoctors: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  
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
    this.loadDoctors();
  }

  loadDoctors(): void {
    this.loading = true;
    this.error = '';
    this.adminService.getAllDoctors().subscribe({
      next: (res) => {
        if (res.success && res.doctors) {
          this.allDoctors = res.doctors;
          this.applyFilters();
        } else {
          this.error = 'Failed to load doctors. Please try again.';
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
    let filtered = [...this.allDoctors];
    
    // Status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === this.statusFilter);
    }
    
    // Search filter (name, specialty)
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(term) ||
        d.specialty.toLowerCase().includes(term)
      );
    }
    
    this.filteredDoctors = filtered;
    this.totalPages = Math.ceil(this.filteredDoctors.length / this.pageSize);
    this.currentPage = 1; // reset to first page
  }

  onSearch(): void { this.applyFilters(); }
  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  get paginatedDoctors(): Doctor[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDoctors.slice(start, start + this.pageSize);
  }

  previousPage(): void { if (this.currentPage > 1) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }

  viewDoctor(id: string): void {
    this.router.navigate(['/admin/doctors', id]);
  }

  deleteDoctor(id: string): void {
    if (confirm('Are you sure you want to delete this doctor? This action cannot be undone.')) {
      this.adminService.deleteDoctor(id).subscribe({
        next: (res) => {
          if (res.success) this.loadDoctors();
          else alert('Failed to delete doctor.');
        },
        error: (err) => {
          console.error(err);
          alert('Error deleting doctor.');
        }
      });
    }
  }

  inviteDoctor(): void {
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
    this.adminService.inviteDoctor(this.inviteEmail).subscribe({
      next: (res) => {
        if (res.success) {
          alert('Invitation sent successfully!');
          this.closeInviteModal();
          this.loadDoctors(); // refresh list
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