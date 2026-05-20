export type DoctorLevel = 'PASS' | 'WARN' | 'FAIL';

export interface DoctorCheck {
  level: DoctorLevel;
  check: string;
  message: string;
  action?: string;
}

export interface DoctorReport {
  status: DoctorLevel;
  checks: DoctorCheck[];
}
