import {
  Activity,
  BookOpenCheck,
  FileCode2,
  Menu,
  PanelLeft,
  PanelLeftClose,
  RefreshCw,
  Search,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useRce } from '../../app/app-context';
import { Link, useRouter, useRouterState } from '../../app/router';
import { ActivityPage } from '../../features/cds/ActivityPage';
import { PatientChartPage } from '../../features/patients/PatientChartPage';
import { PatientsPage } from '../../features/patients/PatientsPage';
import { RuleWorkspacePage } from '../../features/rules/RuleWorkspacePage';
import { RulesPage } from '../../features/rules/RulesPage';
import { roleLabel } from '../../lib/formatters';
import type { ApiScenario, Role } from '../../types';
import { Button, IconButton, SelectInput, ServiceStatus } from '../ui/primitives';

const nav = [
  { to: '/patients', label: 'Pacientes', icon: Users },
  { to: '/rules', label: 'Reglas CQL', icon: FileCode2 },
  { to: '/activity', label: 'Actividad CDS', icon: Activity },
];

export function AppShell() {
  const router = useRouterState();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      </aside>
      {mobileNav ? (
        <div className="mobile-nav" role="presentation" onMouseDown={() => setMobileNav(false)}>
          <aside className="mobile-nav-panel" onMouseDown={(event) => event.stopPropagation()}>
            <Sidebar collapsed={false} onNavigate={() => setMobileNav(false)} />
          </aside>
        </div>
      ) : null}
      <div className="app-main">
        <Topbar onOpenNav={() => setMobileNav(true)} />
        <main id="main-content" className="route-view" tabIndex={-1}>
          {router.route.name === 'patients' ? <PatientsPage /> : null}
          {router.route.name === 'patient' ? (
            <PatientChartPage patientId={router.route.patientId} />
          ) : null}
          {router.route.name === 'rules' || router.route.name === 'rule-new' ? (
            <RulesPage createMode={router.route.name === 'rule-new'} />
          ) : null}
          {router.route.name === 'rule' ? (
            <RuleWorkspacePage ruleId={router.route.ruleId} initialTab={router.route.tab} />
          ) : null}
          {router.route.name === 'activity' ? <ActivityPage /> : null}
          {router.route.name === 'not-found' ? <NotFound /> : null}
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { services } = useRce();
  return (
    <div className="sidebar-inner">
      <div className="brand-row">
        <span className="brand-icon">
          <Stethoscope size={17} aria-hidden />
        </span>
        {!collapsed ? <strong>RCE CQL</strong> : null}
        {onToggle ? (
          <IconButton
            className="sidebar-toggle"
            label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            onClick={onToggle}
          >
            {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </IconButton>
        ) : null}
      </div>
      <nav className="main-nav" aria-label="Navegación principal">
        {nav.map((item) => {
          const active = router.path === item.to || router.path.startsWith(`${item.to}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              ariaCurrent={active ? 'page' : undefined}
              className={`nav-link ${active ? 'is-active' : ''}`}
              onNavigate={onNavigate}
            >
              <Icon size={17} aria-hidden />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-status">
        {!collapsed ? <span className="status-title">Servicios</span> : null}
        <ServiceStatus name="API" state={services.api} />
        <ServiceStatus name="HAPI" state={services.hapi} />
        <ServiceStatus name="CQL" state={services.translator} />
      </div>
    </div>
  );
}

function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const { scenario, setScenario, role, setRole, session, resetSandbox } = useRce();
  const [resetting, setResetting] = useState(false);

  const confirmReset = async () => {
    if (!window.confirm('¿Reiniciar tu sandbox?')) {
      return;
    }
    setResetting(true);
    await resetSandbox();
    setResetting(false);
  };

  return (
    <header className="topbar">
      <IconButton className="mobile-menu-button" label="Abrir navegación" onClick={onOpenNav}>
        <Menu size={20} />
      </IconButton>
      <div className="topbar-search">
        <Search size={16} aria-hidden />
        <input type="search" aria-label="Buscar" placeholder="Buscar pacientes o reglas" />
      </div>
      <div className="topbar-actions">
        <label className="scenario-select">
          <span>Entorno</span>
          <SelectInput
            value={scenario}
            onChange={(event) => setScenario(event.target.value as ApiScenario)}
            aria-label="Escenario del entorno"
          >
            <option value="normal">Operativo</option>
            <option value="translator-down">Traductor caído</option>
            <option value="hapi-down">HAPI caído</option>
          </SelectInput>
        </label>
        <div className="segmented" role="group" aria-label="Rol de la sesión">
          {(['student', 'teacher'] as Role[]).map((candidate) => (
            <button
              key={candidate}
              className={role === candidate ? 'is-selected' : ''}
              onClick={() => setRole(candidate)}
              type="button"
            >
              {roleLabel(candidate)}
            </button>
          ))}
        </div>
        <details className="session-menu">
          <summary>
            <BookOpenCheck size={16} aria-hidden />
            {session?.sandboxLabel ?? 'Sandbox'}
          </summary>
          <div className="session-popover">
            <dl>
              <div>
                <dt>Aula</dt>
                <dd>{session?.classroomId ?? 'cargando'}</dd>
              </div>
              <div>
                <dt>Sandbox</dt>
                <dd>{session?.sandboxLabel ?? 'cargando'}</dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>{roleLabel(role)}</dd>
              </div>
            </dl>
            <Button variant="secondary" onClick={confirmReset} disabled={resetting}>
              <RefreshCw size={15} aria-hidden />
              Reiniciar sandbox
            </Button>
          </div>
        </details>
      </div>
    </header>
  );
}

function NotFound() {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Vista no encontrada</h1>
          <p>La ruta solicitada no existe en la maqueta.</p>
        </div>
      </div>
    </section>
  );
}
