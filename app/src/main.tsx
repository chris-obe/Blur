import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AppAuthProvider } from './auth/AuthProvider';
import { AdminAccessProvider } from './auth/AdminAccessProvider';
import { ThemeProvider } from './store/ThemeProvider';
import { KitProvider } from './store/KitProvider';
import { CompareProvider } from './store/CompareProvider';
import { CatalogProvider } from './store/CatalogProvider';
import { ReactionsProvider } from './store/ReactionsProvider';
import { FeatureFlagsProvider } from './store/FeatureFlagsProvider';
import './index.css';

// Server state lives in React Query: screens read via hooks in hooks/queries.ts
// instead of hand-rolled load()/setLoading/setError effects. 30s staleTime keeps
// tab-hops between Gallery/Albums/Settings from refetching identical lists.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
      <AppAuthProvider>
        <AdminAccessProvider>
          <ThemeProvider>
            <FeatureFlagsProvider>
              <CatalogProvider>
                <KitProvider>
                  <CompareProvider>
                    <ReactionsProvider>
                      <App />
                    </ReactionsProvider>
                  </CompareProvider>
                </KitProvider>
              </CatalogProvider>
            </FeatureFlagsProvider>
          </ThemeProvider>
        </AdminAccessProvider>
      </AppAuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
