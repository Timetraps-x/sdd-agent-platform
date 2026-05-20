export interface ContractValidationIssue {
  field: string;
  message: string;
  recommendation: string;
}

export function contractIssue(field: string, message: string, recommendation: string): ContractValidationIssue {
  return { field, message, recommendation };
}

export function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
