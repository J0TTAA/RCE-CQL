import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import type { CdsSeverity, DependencyState, Lifecycle } from '../../types';
import { lifecycleLabel, severityLabel } from '../../lib/formatters';
import { AlertCircle, CheckCircle2, Circle, Info, ShieldAlert, TriangleAlert } from 'lucide-react';

export function Button({
  children,
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className={`icon-button ${className}`} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="select" {...props} />;
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'critical' | 'interactive';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function AsyncState({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  children: ReactNode;
}) {
  if (loading) {
    return <div className="state-box">Cargando…</div>;
  }
  if (error) {
    return (
      <div className="state-box state-error" role="alert">
        {error}
      </div>
    );
  }
  if (empty) {
    return <div className="state-box">Sin resultados.</div>;
  }
  return <>{children}</>;
}

export function SeverityBadge({ severity }: { severity: CdsSeverity | 'none' }) {
  const Icon =
    severity === 'critical'
      ? ShieldAlert
      : severity === 'warning'
        ? TriangleAlert
        : severity === 'info'
          ? Info
          : Circle;
  const tone = severity === 'none' ? 'neutral' : severity;
  return (
    <span className={`status-pill status-${tone}`}>
      <Icon size={14} aria-hidden />
      {severityLabel(severity)}
    </span>
  );
}

export function LifecycleBadge({ lifecycle }: { lifecycle: Lifecycle }) {
  const tone =
    lifecycle === 'published'
      ? 'success'
      : lifecycle === 'validated'
        ? 'info'
        : lifecycle === 'draft'
          ? 'warning'
          : 'neutral';
  const Icon =
    lifecycle === 'published' || lifecycle === 'validated'
      ? CheckCircle2
      : lifecycle === 'draft'
        ? AlertCircle
        : Circle;
  return (
    <span className={`status-pill status-${tone}`}>
      <Icon size={14} aria-hidden />
      {lifecycleLabel(lifecycle)}
    </span>
  );
}

export function ServiceStatus({ name, state }: { name: string; state: DependencyState }) {
  const label = state === 'up' ? 'Operativo' : state === 'degraded' ? 'Degradado' : 'Caído';
  const tone = state === 'up' ? 'success' : state === 'degraded' ? 'warning' : 'critical';
  return (
    <div className="service-status">
      <span className={`service-dot service-${tone}`} />
      <span>{name}</span>
      <strong>{label}</strong>
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <IconButton label="Cerrar" onClick={onClose}>
            ×
          </IconButton>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}

export function Drawer({
  open,
  title,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <h2>{title}</h2>
          <IconButton label="Cerrar" onClick={onClose}>
            ×
          </IconButton>
        </header>
        <div className="drawer-body">{children}</div>
        {footer ? <footer className="drawer-footer">{footer}</footer> : null}
      </aside>
    </div>
  );
}
