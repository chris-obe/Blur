import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { markVisited, recordLastRoute } from '../../lib/lastRoute';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  useDocumentTitle([title]);
  const location = useLocation();

  // Entering the shell means this browser has used the app; remember where they
  // were so the `/` gate can greet + resume returning sessions.
  useEffect(() => {
    markVisited();
    recordLastRoute(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-bg text-fg">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar title={title} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
