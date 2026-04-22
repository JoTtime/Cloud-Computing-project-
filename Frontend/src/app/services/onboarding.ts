import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';


export interface TimeSlot {
  start: string;
  end: string;
}

export interface DaySchedule {
  isOpen: boolean;
  slots: TimeSlot[];
}

export interface AvailabilityData {
  schedule: Record<string, DaySchedule>;
  slotDuration: number;
  location: string;
  bufferTime: number;
}
export interface OnboardingData {
  specialty?: string;
  phone?: string;
  hospital?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  availability?: AvailabilityData;
  bio?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OnboardingService { 

  private currentStepSubject = new BehaviorSubject<number>(1);
  currentStep$ = this.currentStepSubject.asObservable();

  private openSubject = new BehaviorSubject<boolean>(false);
  open$ = this.openSubject.asObservable();

  // Store onboarding data
  private onboardingData: OnboardingData = {};
  private readonly storageKey = 'onboardingData';
  
  // Track completion in memory instead of localStorage
  private onboardingComplete = false;

  open() {
    this.openSubject.next(true);
  }

  close() {
    this.openSubject.next(false);
    this.currentStepSubject.next(1);
  }

  isOpen(): Observable<boolean> {
    return this.open$;
  }

  currentStep(): Observable<number> {
    return this.currentStep$;
  }

  // Methods to save data from each step
  saveStep1Data(data: Partial<OnboardingData>) {
    this.onboardingData = { ...this.onboardingData, ...data };
    this.persistData();
  }

  saveStep2Data(data: Partial<OnboardingData>) {
    this.onboardingData = { ...this.onboardingData, ...data };
    this.persistData();
  }

  saveStep3Data(data: Partial<OnboardingData>) {
    this.onboardingData = { ...this.onboardingData, ...data };
    this.persistData();
  }

  getOnboardingData(): OnboardingData {
    if (Object.keys(this.onboardingData).length > 0) {
      return this.onboardingData;
    }
    const raw = localStorage.getItem(this.storageKey);
    this.onboardingData = raw ? JSON.parse(raw) : {};
    return this.onboardingData;
  }

  clearData() {
    this.onboardingData = {};
    localStorage.removeItem(this.storageKey);
  }

  markComplete() {
    this.onboardingComplete = true;
  }

  isComplete(): boolean {
    return this.onboardingComplete;
  }

  nextStep() {
    const step = this.currentStepSubject.value;
    if (step < 4) {
      this.currentStepSubject.next(step + 1);
    } else {
      this.close();
      this.markComplete();
      this.clearData();
    }
  }

  previousStep() {
    const step = this.currentStepSubject.value;
    if (step > 1) {
      this.currentStepSubject.next(step - 1);
    }
  }

  private persistData(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.onboardingData));
  }
  
}
