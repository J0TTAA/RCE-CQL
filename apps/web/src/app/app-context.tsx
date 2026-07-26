import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { mockRceApi } from '../mocks/mock-rce-api';
import type { ApiScenario, Role, ServicesStatus, SessionContext } from '../types';

interface RceContextValue {
  api: typeof mockRceApi;
  session: SessionContext | null;
  role: Role;
  setRole: (role: Role) => Promise<void>;
  scenario: ApiScenario;
  setScenario: (scenario: ApiScenario) => void;
  services: ServicesStatus;
  refreshServices: () => Promise<void>;
  resetSandbox: () => Promise<void>;
}

const RceContext = createContext<RceContextValue | null>(null);

const defaultServices: ServicesStatus = { api: 'up', hapi: 'up', translator: 'up' };

export function RceProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionContext | null>(null);
  const [scenario, setScenarioState] = useState<ApiScenario>(mockRceApi.getScenario());
  const [services, setServices] = useState<ServicesStatus>(defaultServices);

  const refreshServices = useCallback(async () => {
    const next = await mockRceApi.getServicesStatus();
    setServices(next);
  }, []);

  useEffect(() => {
    mockRceApi.getSession().then(setSession);
    refreshServices();
  }, [refreshServices]);

  const setRole = useCallback(async (role: Role) => {
    const next = await mockRceApi.setRole(role);
    setSession(next);
  }, []);

  const setScenario = useCallback(
    (next: ApiScenario) => {
      mockRceApi.setScenario(next);
      setScenarioState(next);
      refreshServices();
    },
    [refreshServices],
  );

  const resetSandbox = useCallback(async () => {
    const next = await mockRceApi.resetSandbox();
    setSession(next);
    await refreshServices();
  }, [refreshServices]);

  const value = useMemo<RceContextValue>(
    () => ({
      api: mockRceApi,
      session,
      role: session?.role ?? 'student',
      setRole,
      scenario,
      setScenario,
      services,
      refreshServices,
      resetSandbox,
    }),
    [refreshServices, resetSandbox, scenario, services, session, setRole, setScenario],
  );

  return <RceContext.Provider value={value}>{children}</RceContext.Provider>;
}

export function useRce(): RceContextValue {
  const context = useContext(RceContext);
  if (!context) {
    throw new Error('useRce debe usarse dentro de RceProvider.');
  }
  return context;
}
