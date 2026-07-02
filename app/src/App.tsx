import { Suspense, lazy, type ReactNode } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell';
import { GalleryPage } from './components/gallery/GalleryPage';
import { GalleryRoute, AlbumGalleryRoute } from './pages/Gallery';
import { Stub } from './pages/Stub';
import { EmbedPhoto } from './pages/EmbedPhoto';
import { EmbedGallery } from './pages/EmbedGallery';
import { FeatureFlagGate } from './store/FeatureFlagsProvider';

// Route-level code splitting: the gallery (default route) stays eager; the
// heavier screens — Admin (~3k lines), Compare (visx), Albums (editor +
// metadata grid), Settings, Suggestions, MyKit — load on navigation so
// anonymous gallery visitors never download them.
const Compare = lazy(() => import('./pages/Compare').then((module) => ({ default: module.Compare })));
const MyKit = lazy(() => import('./pages/MyKit').then((module) => ({ default: module.MyKit })));
const Suggestions = lazy(() => import('./pages/Suggestions').then((module) => ({ default: module.Suggestions })));
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })));
const Admin = lazy(() => import('./pages/Admin').then((module) => ({ default: module.Admin })));
const Albums = lazy(() => import('./pages/Albums').then((module) => ({ default: module.Albums })));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="border border-line px-5 py-4 text-xs text-muted">Loading</div>
    </div>
  );
}

function Deferred({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AppShell title="Gallery">
            <FeatureFlagGate flag="gallery">
              <GalleryPage />
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/gallery/photo/:photoId"
        element={
          <AppShell title="Gallery">
            <FeatureFlagGate flag="gallery">
              <GalleryRoute />
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/g/:albumSlug"
        element={
          <AppShell title="Gallery">
            <FeatureFlagGate flag="gallery">
              <AlbumGalleryRoute />
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/g/:albumSlug/photo/:photoId"
        element={
          <AppShell title="Gallery">
            <FeatureFlagGate flag="gallery">
              <AlbumGalleryRoute />
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route path="/embed/photo/:photoId" element={<EmbedPhoto />} />
      <Route path="/embed/album/:albumSlug" element={<EmbedGallery mode="album" />} />
      <Route path="/embed/photos" element={<EmbedGallery mode="set" />} />
      <Route
        path="/albums"
        element={
          <AppShell title="Albums">
            <FeatureFlagGate flag="albums">
              <Deferred><Albums /></Deferred>
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/albums/:albumSlug"
        element={
          <AppShell title="Albums">
            <FeatureFlagGate flag="albums">
              <Deferred><Albums /></Deferred>
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/compare"
        element={
          <AppShell title="Compare">
            <FeatureFlagGate flag="compare">
              <Deferred><Compare /></Deferred>
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/kit"
        element={
          <AppShell title="My Kit">
            <FeatureFlagGate flag="kit">
              <Deferred><MyKit /></Deferred>
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/suggestions"
        element={
          <AppShell title="Suggestions">
            <FeatureFlagGate flag="suggestions">
              <Deferred><Suggestions /></Deferred>
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/settings"
        element={
          <AppShell title="Settings">
            <FeatureFlagGate flag="settings">
              <Deferred><Settings /></Deferred>
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/admin"
        element={
          <AppShell title="Admin">
            <Deferred><Admin /></Deferred>
          </AppShell>
        }
      />
      <Route
        path="*"
        element={
          <AppShell title="Not found">
            <Stub name="404 — nothing here" />
          </AppShell>
        }
      />
    </Routes>
  );
}
