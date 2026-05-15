export function wantsJson(args: string[]): boolean {
  return args.includes('--json') || args.includes('--compact-json');
}

export function jsonOutput(value: unknown, args: string[]): string {
  return JSON.stringify(value, null, args.includes('--compact-json') ? 0 : 2);
}

export function renderTextOrJson<T>(args: string[], value: T, renderText: (value: T) => string): string {
  return wantsJson(args) ? jsonOutput(value, args) : renderText(value);
}
