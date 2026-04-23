import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UploadDoc, DocumentResponse } from '../../services/upload-doc';
import { ActivatedRoute } from '@angular/router';

interface MedicalDocument {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  date: string;
  fileSize: string;
}

@Component({
  selector: 'app-records',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './records.html',
  styleUrls: ['./records.css']
})
export class Records implements OnInit {
  @ViewChild('fileUpload') fileUpload!: ElementRef<HTMLInputElement>;

  userName: string = '';
  searchQuery: string = '';
  selectedCategory: string = 'all';
  loading: boolean = true;

  categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'lab_results', label: 'Lab Results', color: '#0369a1' },
    { value: 'imaging', label: 'Imaging', color: '#0891b2' },
    { value: 'prescription', label: 'Prescription', color: '#ea580c' },
    { value: 'clinical_notes', label: 'Clinical Notes', color: '#7c3aed' },
    { value: 'vaccination_records', label: 'Vaccination Records', color: '#16a34a' },
    { value: 'others', label: 'Other', color: '#6b8090' }
  ];

  private categoryLabels: { [key: string]: string } = {
    'lab_results': 'Lab Results',
    'imaging': 'Imaging',
    'prescription': 'Prescription',
    'clinical_notes': 'Clinical Notes',
    'vaccination_records': 'Vaccination Records',
    'others': 'Other'
  };

  allDocuments: MedicalDocument[] = [];
  filteredDocuments: MedicalDocument[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private uploadDocService: UploadDoc
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
    if (params['search']) {
      this.searchQuery = params['search'];
      this.filterDocuments();
    }
  });
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.loading = true;
    this.uploadDocService.getMyDocuments().subscribe({
      next: (documents: DocumentResponse[]) => {
        this.allDocuments = documents.map(doc => this.mapDocumentResponse(doc));
        this.filteredDocuments = [...this.allDocuments];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading documents:', error);
        this.loading = false;
        this.allDocuments = [];
        this.filteredDocuments = [];
      }
    });
  }

  private mapDocumentResponse(doc: DocumentResponse): MedicalDocument {
    const category = this.categories.find(c => c.value === doc.category);
    const docDate = new Date(doc.docDate);
    return {
      id: doc._id,
      title: doc.docTitle,
      category: this.categoryLabels[doc.category] || doc.category,
      categoryColor: category?.color || '#6b8090',
      date: docDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      fileSize: 'N/A'
    };
  }

  filterDocuments(): void {
    this.filteredDocuments = this.allDocuments.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCategory = this.selectedCategory === 'all' || 
                               doc.category.toLowerCase().includes(this.selectedCategory.replace('_', ' '));
      return matchesSearch && matchesCategory;
    });
  }

  triggerFileUpload(): void {
    this.fileUpload.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      // Navigate to upload page with file data
      this.router.navigate(['/patient/medical-records/upload'], { state: { file } });
      input.value = ''; // reset
    }
  }

  viewDocument(docId: string): void {
    this.router.navigate(['/patient/medical-records', docId]);
  }
}