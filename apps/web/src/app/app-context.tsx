import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createHttpRceApi, type RceUiApi } from '../lib/rce-api';
import type { Role, ServicesStatus, SessionContext } from '../types';

interface RceContextValue {
  api: RceUiApi;
  session: SessionContext | null;
  role: Role;
  setRole: (role: Role) => Promise<void>;
  services: ServicesStatus;
  refreshServices: () => Promise<void>;
  resetSandbox: () => Promise<void>;
}

const RceContext = createContext<RceContextValue | null>(null);

const defaultServices: ServicesStatus = { api: 'up', hapi: 'up', translator: 'up' };
const api = createHttpRceApi();

export function RceProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionContext | null>(null);
  const [services, setServices] = useState<ServicesStatus>(defaultServices);

  const refreshServices = useCallback(async () => {
    const next = await api.getServicesStatus();
    setServices(next);
  }, []);

  useEffect(() => {
    api.getSession().then(setSession);
    refreshServices();
  }, [refreshServices]);

  const setRole = useCallback(async (role: Role) => {
    const next = await api.setRole(role);
    setSession(next);
  }, []);

  const resetSandbox = useCallback(async () => {
    const next = await api.resetSandbox();
    setSession(next);
    await refreshServices();
  }, [refreshServices]);

  const value = useMemo<RceContextValue>(
    () => ({
      api,
      session,
      role: session?.role ?? 'student',
      setRole,
      services,
      refreshServices,
      resetSandbox,
    }),
    [refreshServices, resetSandbox, services, session, setRole],
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
