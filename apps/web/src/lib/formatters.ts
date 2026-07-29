import type { CdsSeverity, Lifecycle, Role } from '../types';

export function roleLabel(role: Role): string {
  return role === 'teacher' ? 'Docente' : 'Alumno';
}

export function lifecycleLabel(lifecycle: Lifecycle): string {
  const labels: Record<Lifecycle, string> = {
    draft: 'Borrador',
    validated: 'Validada',
    published: 'Publicada',
    disabled: 'Deshabilitada',
    retired: 'Retirada',
  };
  return labels[lifecycle];
}

export function severityLabel(severity: CdsSeverity | 'none'): string {
  const labels: Record<CdsSeverity | 'none', string> = {
    critical: 'Crítica',
    warning: 'Advertencia',
    info: 'Info',
    none: 'Sin cards',
  };
  return labels[severity];
}

export function formatDate(date?: string | null): string {
  const value = date?.trim();
  if (!value) {
    return 'Sin fecha';
  }
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return 'Sin fecha';
  }
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}

export function formatAge(age?: number | null): string {
  return typeof age === 'number' ? `${age} años` : 'Sin edad';
}

export function shortId(value: string): string {
  return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}
