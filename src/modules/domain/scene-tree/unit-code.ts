// Builds a concrete unit code from a typical floor's template.

/** Fills "{floor}" and "{suffix}" in a template such as "{floor}{suffix}". */
export function buildUnitCode(template: string, floor: number, suffix: string): string {
  return template.replaceAll("{floor}", String(floor)).replaceAll("{suffix}", suffix);
}
