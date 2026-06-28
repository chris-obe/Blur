import { Auth0Provider, type AppState } from '@auth0/auth0-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

const domain = import.meta.env.VITE_AUTH0_DOMAIN ?? 'your-tenant.auth0.com';
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID ?? 'your-auth0-spa-client-id';
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo ?? window.location.pathname, { replace: true });
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        ...(audience ? { audience } : {}),
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
}
