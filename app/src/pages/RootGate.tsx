import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Splash, type SplashStatus } from '../components/landing/Splash';
import { Landing } from './Landing';
import { getLastRoute, getRememberedName, markVisited, rememberName } from '../lib/lastRoute';

// Set once per full page load. A client-side navigation back to `/` (e.g. the
// user clicking the brand) therefore skips the splash and shows the landing
// directly — the splash is only for the initial cold entry.
let hasColdLoaded = false;

// The `/` gate. On cold load it shows the splash while Auth0 rehydrates; an
// authenticated session is greeted and redirected into the app (last route),
// everyone else lands on the marketing page.
export function RootGate() {
  const { isLoading, isAuthenticated, user } = useAuth0();
  const navigate = useNavigate();
  const [coldLoad] = useState(() => !hasColdLoaded);
  const [showSplash, setShowSplash] = useState(coldLoad);

  useEffect(() => {
    hasColdLoaded = true;
  }, []);

  // Keep a display name around so a logged-out returner still gets "Welcome back".
  useEffect(() => {
    if (isAuthenticated) rememberName(user?.name ?? user?.nickname ?? null);
  }, [isAuthenticated, user]);

  const status: SplashStatus = isLoading ? 'pending' : isAuthenticated ? 'authed' : 'anon';

  const finishSplash = () => {
    if (isAuthenticated) {
      markVisited();
      navigate(getLastRoute(), { replace: true });
      return;
    }
    setShowSplash(false);
  };

  if (showSplash) {
    return (
      <Splash
        status={status}
        name={user?.name ?? user?.nickname ?? getRememberedName()}
        onFinish={finishSplash}
      />
    );
  }

  return <Landing />;
}
