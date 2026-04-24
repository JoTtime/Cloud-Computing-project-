import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OnboardingService } from '../../services/onboarding';

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  isOpen: boolean;
  slots: TimeSlot[];
}



@Component({
  selector: 'app-step2',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './step2.html',
  styleUrl: './step2.css',
})
export class Step2 {

  schedule: Record<string, DaySchedule> = {
    monday: { isOpen: true, slots: [{ start: '09:00', end: '17:00' }] },
    tuesday: { isOpen: true, slots: [{ start: '09:00', end: '17:00' }] },
    wednesday: { isOpen: true, slots: [{ start: '09:00', end: '17:00' }] },
    thursday: { isOpen: true, slots: [{ start: '09:00', end: '17:00' }] },
    friday: { isOpen: true, slots: [{ start: '09:00', end: '17:00' }] },
    saturday: { isOpen: false, slots: [] },
    sunday: { isOpen: false, slots: [] }
  };

  days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  slotDuration: number = 30; // minutes
  location: string = '';

  constructor(private onboardingService: OnboardingService) {}

  ngOnInit(): void {
    // Load any previously saved data
    const savedData = this.onboardingService.getOnboardingData();

  if (savedData.availability) {
    const schedule = savedData.availability.schedule;

    const parsedSchedule = typeof schedule === 'string' ? JSON.parse(schedule) : schedule;
    this.schedule = this.normalizeSchedule(parsedSchedule);

   this.slotDuration = Number(savedData.availability.slotDuration) || 30;
    this.location = savedData.availability.location ?? '';
  }
  }

  toggleDay(dayKey: string): void {
    this.schedule[dayKey].isOpen = !this.schedule[dayKey].isOpen;
    
    if (this.schedule[dayKey].isOpen && this.schedule[dayKey].slots.length === 0) {
      // Add default slot when opening a day
      this.schedule[dayKey].slots = [{ start: '09:00', end: '17:00' }];
    }
  }

  addSlot(dayKey: string): void {
    const lastSlot = this.schedule[dayKey].slots[this.schedule[dayKey].slots.length - 1];
    const newStart = lastSlot ? lastSlot.end : '09:00';
    const newEnd = this.addMinutesToTime(newStart, 60); // Default 1 hour slot
    
    this.schedule[dayKey].slots.push({ start: newStart, end: newEnd });
  }

  removeSlot(dayKey: string, index: number): void {
    if (this.schedule[dayKey].slots.length > 1) {
      this.schedule[dayKey].slots.splice(index, 1);
    } else {
      alert('You must have at least one time slot for open days');
    }
  }

  addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  }

  isValidSchedule(): boolean {
    // Check if at least one day is open
    const hasOpenDay = Object.values(this.schedule).some(day => day.isOpen);
    
    if (!hasOpenDay) {
      return false;
    }

    // Validate all time slots
    for (const day of Object.values(this.schedule)) {
      if (day.isOpen) {
        for (const slot of day.slots) {
          if (!slot.start || !slot.end) {
            return false;
          }
          // Check that end time is after start time
          if (slot.start >= slot.end) {
            return false;
          }
        }
      }
    }

    return true;
  }

  close() {
    this.onboardingService.close();
  }

  back() {
    this.onboardingService.previousStep();
  }

  next() {
    if (!this.isValidSchedule()) {
      alert('Please set valid availability hours for at least one day');
      return;
    }

    if (this.slotDuration < 15 || this.slotDuration > 120) {
      alert('Slot duration must be between 15 and 120 minutes');
      return;
    }

    // Convert schedule to the format needed for backend
    const formattedSchedule: any = {};
    for (const [key, value] of Object.entries(this.schedule)) {
      formattedSchedule[key] = value.isOpen ? value.slots : [];
    }

    this.onboardingService.saveStep2Data({
      availability: {
        schedule: formattedSchedule,
        slotDuration: this.slotDuration,
        location: this.location,
        bufferTime: 0
      }
    });
    
    this.onboardingService.nextStep();
  }

  getDayStatus(dayKey: string): string {
    const day = this.schedule[dayKey];
    if (!day.isOpen) return 'Closed';
    
    return day.slots.map(slot => `${slot.start} - ${slot.end}`).join(', ');
  }

  private normalizeSchedule(rawSchedule: any): Record<string, DaySchedule> {
    const normalized: Record<string, DaySchedule> = { ...this.schedule };

    this.days.forEach(day => {
      const value = rawSchedule?.[day.key];
      if (Array.isArray(value)) {
        normalized[day.key] = {
          isOpen: value.length > 0,
          slots: value.length > 0 ? value : [{ start: '09:00', end: '17:00' }]
        };
      } else if (value && typeof value === 'object') {
        normalized[day.key] = {
          isOpen: !!value.isOpen,
          slots: Array.isArray(value.slots) && value.slots.length > 0 ? value.slots : [{ start: '09:00', end: '17:00' }]
        };
      }
    });

    return normalized;
  }
}
