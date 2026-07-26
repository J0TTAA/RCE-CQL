import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components/layout/AppShell';
import { RceProvider } from './app/app-context';
import './styles/tokens.css';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RceProvider>
      <AppShell />
    </RceProvider>
  </StrictMode>,
);
