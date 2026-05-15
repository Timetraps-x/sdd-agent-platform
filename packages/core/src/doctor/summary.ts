import type { DoctorCheck, DoctorLevel } from './model.js';

export function summarizeDoctorStatus(checks: DoctorCheck[]): DoctorLevel {
  if (checks.some((check) => check.level === 'FAIL')) {
    return 'FAIL';
  }
  if (checks.some((check) => check.level === 'WARN')) {
    return 'WARN';
  }
  return 'PASS';
}
