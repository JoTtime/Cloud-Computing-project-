import { CommonModule } from '@angular/common';
import { Component, ViewChild, ElementRef, AfterViewChecked, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService, Message, Conversation } from '../../services/message';
import { ConnectionService } from '../../services/connection';

interface DisplayMessage {
  text: string;
  time: string;
  isDoctor: boolean;
  hasAttachment?: boolean;
  attachmentName?: string;
  attachmentUrl?: string;
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.html',
  styleUrls: ['./messages.css']
})
export class Messages implements AfterViewChecked, OnInit, OnDestroy {
  userName: string = '';
  currentUserRole: 'doctor' | 'patient' = 'doctor';
  currentUserId: string = '';

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('messagesArea') messagesArea!: ElementRef<HTMLDivElement>;

  conversations: any[] = [];
  selectedConversation: any = null;
  messages: DisplayMessage[] = [];
  messageText: string = '';
  attachedFile: File | null = null;
  searchQuery: string = '';
  isTyping: boolean = false;
  isLoading: boolean = false;
  private shouldScrollToBottom: boolean = false;
  private pollingInterval: any;

  constructor(
    private messageService: MessageService,
    private connectionService: ConnectionService
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadConversations();
    this.pollingInterval = setInterval(() => {
      if (this.selectedConversation) {
        this.loadMessages(this.selectedConversation.connectionId, false);
      }
      this.loadConversations();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }

  loadUserInfo(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.currentUserId = user.userId || user.id || user._id;
      this.currentUserRole = user.userType === 'patient' ? 'patient' : 'doctor';
      this.userName = `${user.firstName} ${user.lastName}`;
    }
  }

  loadConversations(): void {
    const isInitialLoad = this.conversations.length === 0;
    if (isInitialLoad) this.isLoading = true;

    this.messageService.getConversations().subscribe({
      next: (response) => {
        if (response.success && response.conversations) {
          this.conversations = response.conversations.map(conv => ({
            id: conv.connectionId,
            connectionId: conv.connectionId,
            participantId: conv.participantId,
            name: conv.participantName,
            role: conv.participantRole,
            lastMessage: conv.lastMessage || 'No messages yet',
            time: this.formatTime(conv.lastMessageTime),
            unread: conv.unreadCount,
            online: conv.online
          }));
          if (this.conversations.length > 0 && !this.selectedConversation && isInitialLoad) {
            this.selectConversation(this.conversations[0]);
          }
        }
        if (isInitialLoad) this.isLoading = false;
      },
      error: () => { if (isInitialLoad) this.isLoading = false; }
    });
  }

  selectConversation(conversation: any): void {
    this.selectedConversation = conversation;
    conversation.unread = 0;
    this.loadMessages(conversation.connectionId);
    this.messageService.markAsRead(conversation.connectionId).subscribe();
  }

  loadMessages(connectionId: string, scrollToBottom: boolean = true): void {
    this.messageService.getMessages(connectionId).subscribe({
      next: (response) => {
        if (response.success && response.messages) {
          const prevCount = this.messages.length;
          this.messages = response.messages.map(msg => ({
            text: msg.content,
            time: this.formatTime(msg.createdAt),
            isDoctor: msg.sender === this.currentUserId,
            hasAttachment: msg.hasAttachment,
            attachmentName: msg.attachmentName,
            attachmentUrl: msg.attachmentUrl
          }));
          if (scrollToBottom || this.messages.length > prevCount) this.shouldScrollToBottom = true;
        }
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('File size exceeds 10MB limit.');
        return;
      }
      this.attachedFile = file;
    }
  }

  removeAttachment(): void {
    this.attachedFile = null;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  onEnterPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(): void {
    if ((!this.messageText.trim() && !this.attachedFile) || !this.selectedConversation) return;
    const connectionId = this.selectedConversation.connectionId;
    const content = this.messageText.trim() || (this.attachedFile ? `Sent ${this.attachedFile.name}` : '');
    this.messageService.sendMessage(connectionId, content, this.attachedFile || undefined).subscribe({
      next: (response) => {
        if (response.success) {
          this.messages.push({
            text: content,
            time: this.formatTime(new Date().toISOString()),
            isDoctor: true,
            hasAttachment: !!this.attachedFile,
            attachmentName: this.attachedFile?.name
          });
          this.selectedConversation.lastMessage = content;
          this.selectedConversation.time = this.formatTime(new Date().toISOString());
          this.messageText = '';
          this.attachedFile = null;
          if (this.fileInput) this.fileInput.nativeElement.value = '';
          this.shouldScrollToBottom = true;
          this.loadConversations();
        }
      },
      error: (err) => { console.error('Send error', err); alert('Failed to send message.'); }
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesArea) this.messagesArea.nativeElement.scrollTop = this.messagesArea.nativeElement.scrollHeight;
    } catch (err) {}
  }

  get filteredConversations(): any[] {
    if (!this.searchQuery.trim()) return this.conversations;
    const q = this.searchQuery.toLowerCase();
    return this.conversations.filter(c => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
  }

  get profileActionLabel(): string {
    return this.currentUserRole === 'doctor' ? 'View Patient Profile' : 'View Doctor Profile';
  }
}