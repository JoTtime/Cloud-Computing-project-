// dashboard.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';  // 👈 needed for ngModel

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],  // 👈 add FormsModule
  templateUrl: './dashboard.html',   
  styleUrls: ['./dashboard.css']    
})
export class Dashboard implements OnInit {
  userName: string = '';
  searchQuery: string = '';  // 👈 bind to input

  constructor(private router: Router) {}  // 👈 inject Router

  ngOnInit(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userName = `${user.firstName} ${user.lastName}`;
    } else {
      this.userName = 'Jeremie Tchuente';
    }
  }

  // 👈 called when user presses Enter in search input
  performSearch(): void {
    if (!this.searchQuery.trim()) return;
    // Redirect to medical records page with search query param
    this.router.navigate(['/patient/medical-records'], { 
      queryParams: { search: this.searchQuery }
    });
    // Optional: clear search input after navigation
    // this.searchQuery = '';
  }
  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token'); // if you store a token
    this.router.navigate(['/login']);
  }
}