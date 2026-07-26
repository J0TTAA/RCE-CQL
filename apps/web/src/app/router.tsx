import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import type { RuleHook } from '../types';

export type Route =
  | { name: 'patients' }
  | { name: 'patient'; patientId: string }
  | { name: 'rules' }
  | { name: 'rule-new' }
  | { name: 'rule'; ruleId: string; tab?: 'metadata' | 'test' | 'elm' }
  | { name: 'activity' }
  | { name: 'not-found' };

interface RouterValue {
  route: Route;
  path: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  linkProps: (to: string) => {
    href: string;
    onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  };
}

let currentRouter: RouterValue | null = null;

export function parseRoute(path: string): Route {
  const clean = path.replace(/\/+$/, '') || '/';
  const parts = clean.split('/').filter(Boolean);
  if (clean === '/') {
    return { name: 'patients' };
  }
  if (clean === '/patients') {
    return { name: 'patients' };
  }
  if (parts[0] === 'patients' && parts[1]) {
    return { name: 'patient', patientId: parts[1] };
  }
  if (clean === '/rules') {
    return { name: 'rules' };
  }
  if (clean === '/rules/new') {
    return { name: 'rule-new' };
  }
  if (parts[0] === 'rules' && parts[1] && parts[2] === 'test') {
    return { name: 'rule', ruleId: parts[1], tab: 'test' };
  }
  if (parts[0] === 'rules' && parts[1]) {
    return { name: 'rule', ruleId: parts[1] };
  }
  if (clean === '/activity') {
    return { name: 'activity' };
  }
  return { name: 'not-found' };
}

export function useRouterState(): RouterValue {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    if (window.location.pathname === '/') {
      window.history.replaceState(null, '', '/patients');
      setPath('/patients');
    }
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState(null, '', to);
    } else {
      window.history.pushState(null, '', to);
    }
    setPath(window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const value = useMemo<RouterValue>(() => {
    const route = parseRoute(path);
    return {
      route,
      path,
      navigate,
      linkProps: (to) => ({
        href: to,
        onClick: (event) => {
          if (
            event.defaultPrevented ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          ) {
            return;
          }
          event.preventDefault();
          navigate(to);
        },
      }),
    };
  }, [navigate, path]);

  currentRouter = value;
  return value;
}

export function useRouter(): RouterValue {
  if (!currentRouter) {
    throw new Error('useRouter debe usarse dentro de AppRouter.');
  }
  return currentRouter;
}

export function hookLabel(hook: RuleHook): string {
  return hook;
}

export function Link({
  to,
  children,
  className,
  ariaCurrent,
  ariaLabel,
  onNavigate,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  ariaCurrent?: 'page';
  ariaLabel?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const link = router.linkProps(to);
  return (
    <a
      className={className}
      aria-current={ariaCurrent}
      aria-label={ariaLabel}
      href={link.href}
      onClick={(event) => {
        const shouldNavigate = !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
        link.onClick(event);
        if (shouldNavigate) {
          onNavigate?.();
        }
      }}
    >
      {children}
    </a>
  );
}
