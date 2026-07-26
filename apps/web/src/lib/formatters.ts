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

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(`${date}T00:00:00`));
}

export function shortId(value: string): string {
  return value.length > 10 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}
