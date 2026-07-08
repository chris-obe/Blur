import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Aperture, ArrowRight, GitCompare, Images, PlayCircle, SquareStack } from 'lucide-react';
import { usePublicGalleryPhotos } from '../hooks/usePublicGalleryPhotos';
import { formatLabel } from '../lib/categories';
import { thumbSrc } from '../lib/imageSrc';
import { getLastRoute, getRememberedName, hasVisited } from '../lib/lastRoute';
import type { GalleryItem } from '../lib/types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/shell/ThemeToggle';
import { UserMenu } from '../components/shell/UserMenu';
import { VideoModal } from '../components/landing/VideoModal';

type Audience = 'new' | 'returning' | 'signed-in';

const JOBS = [
  {
    icon: Images,
    title: 'A reference gallery',
    body: 'Every photograph carries its real camera, lens, format, aperture, shutter, and ISO — not a stripped JPEG.',
    to: '/gallery',
    cta: 'Open the gallery',
  },
  {
    icon: GitCompare,
    title: 'Compare the look',
    body: 'Line up any two systems and watch field of view and background blur converge — or pull apart.',
    to: '/compare',
    cta: 'Compare systems',
  },
  {
    icon: Aperture,
    title: 'Know your kit',
    body: 'Save your bodies and lenses and get a straight verdict: can they already make this look, or not?',
    to: '/kit',
    cta: 'Build your kit',
  },
  {
    icon: SquareStack,
    title: 'Embed anywhere',
    body: 'Drop optics-aware photo frames into a post — the image, its settings, and a path back into blur.',
    to: '/settings',
    cta: 'See embeds',
  },
];

const STEPS = [
  { n: '01', title: 'Open a photograph', body: 'See the optics the frame was actually made with.' },
  { n: '02', title: 'Choose a target format', body: 'Full frame, medium format, Micro Four Thirds, a phone.' },
  { n: '03', title: 'Read the equivalent', body: 'The focal length and aperture that recreate the look.' },
];

const FORMATS = ['4×5', 'XPan', '6×7', 'Full frame', 'APS-C', 'Micro Four Thirds', 'Compact', 'Phone'];

function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Landing() {
  useDocumentTitle(['blur']);
  const navigate = useNavigate();
  const { isAuthenticated, user, loginWithRedirect } = useAuth0();
  const { photos } = usePublicGalleryPhotos();
  const [videoOpen, setVideoOpen] = useState(false);

  const audience: Audience = isAuthenticated
    ? 'signed-in'
    : hasVisited() || getRememberedName()
      ? 'returning'
      : 'new';
  const name = user?.name ?? user?.nickname ?? getRememberedName() ?? null;

  const heroPhoto = photos[0] ?? null;
  const strip = useMemo(() => photos.slice(0, 8), [photos]);

  const signIn = () => loginWithRedirect({ appState: { returnTo: getLastRoute() } });
  const openDemo = () => setVideoOpen(true);

  return (
    <div className="min-h-[100dvh] bg-bg text-fg">
      <LandingHeader />

      {/* Hero */}
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[1400px] flex-col gap-10 px-6 py-12 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:py-16">
        <div className="max-w-xl">
          {audience === 'signed-in' && name && (
            <div className="label mb-4">Signed in as {name}</div>
          )}
          {audience === 'returning' && (
            <div className="label mb-4">Welcome back{name ? `, ${name}` : ''}</div>
          )}
          {audience === 'new' && (
            <div className="label mb-4">Gallery · Compare · Kit · Embeds</div>
          )}

          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Understand the look of any frame.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
            {audience === 'returning'
              ? 'Sign in to pick up your albums, kit, and saved comparisons — or keep browsing the public gallery.'
              : 'See a photograph’s real optics, then find the focal length and aperture that recreate its look on another camera, film stock, or phone.'}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {audience === 'signed-in' ? (
              <Button variant="solid" onClick={() => navigate(getLastRoute())}>
                Continue
                <ArrowRight size={15} strokeWidth={1.6} />
              </Button>
            ) : audience === 'returning' ? (
              <Button variant="solid" onClick={signIn}>
                Sign in
                <ArrowRight size={15} strokeWidth={1.6} />
              </Button>
            ) : (
              <Button variant="solid" onClick={() => navigate('/gallery')}>
                Browse the gallery
                <ArrowRight size={15} strokeWidth={1.6} />
              </Button>
            )}
            {audience === 'returning' ? (
              <Button onClick={() => navigate('/gallery')}>Browse the gallery</Button>
            ) : (
              <Button onClick={openDemo}>
                <PlayCircle size={15} strokeWidth={1.6} />
                View demo
              </Button>
            )}
          </div>
        </div>

        <HeroVisual photo={heroPhoto} />
      </section>

      {/* The question */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-[1400px] px-6 py-20 lg:py-28">
          <Reveal>
            <p className="max-w-4xl text-2xl font-semibold leading-snug tracking-tight sm:text-3xl lg:text-4xl">
              “If this photograph was made on that camera and lens — what would I need on
              <span className="text-muted"> my </span>
              system to get the same field of view and depth-of-field feel?”
            </p>
            <p className="mt-6 max-w-xl text-sm text-muted">
              blur is part calculator, part reference gallery, part kit notebook. It treats photographs
              as references, not just files.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Four jobs */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-[1400px] px-6 py-20 lg:py-28">
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
            {JOBS.map((job, i) => (
              <Reveal key={job.title} delay={i * 0.05}>
                <Link
                  to={job.to}
                  className="group flex h-full flex-col gap-4 bg-bg p-8 transition-colors hover:bg-surface"
                >
                  <job.icon size={22} strokeWidth={1.5} />
                  <div className="text-lg font-bold tracking-tight">{job.title}</div>
                  <p className="text-sm leading-relaxed text-muted">{job.body}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-fg">
                    {job.cta}
                    <ArrowRight size={13} strokeWidth={1.6} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery strip */}
      {strip.length > 0 && (
        <section className="border-t border-line">
          <div className="mx-auto max-w-[1400px] px-6 py-20 lg:py-28">
            <Reveal className="mb-8 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Start from a real frame</h2>
              <Link to="/gallery" className="hidden shrink-0 items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-muted hover:text-fg sm:inline-flex">
                All photos <ArrowRight size={13} strokeWidth={1.6} />
              </Link>
            </Reveal>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {strip.map((photo, i) => (
                <Reveal key={photo.id} delay={i * 0.03}>
                  <Link
                    to="/gallery"
                    className="group block aspect-square overflow-hidden border border-line bg-faint"
                    aria-label={`Open the gallery — ${photo.title}`}
                  >
                    <img
                      src={thumbSrc(photo.src)}
                      alt={photo.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover grayscale transition-[filter,transform] duration-300 group-hover:grayscale-0 group-hover:scale-[1.03]"
                    />
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-[1400px] px-6 py-20 lg:py-28">
          <Reveal>
            <h2 className="mb-10 text-2xl font-bold tracking-tight sm:text-3xl">Three steps to the equivalent</h2>
          </Reveal>
          <div className="grid gap-px border border-line bg-line md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.06}>
                <div className="flex h-full flex-col gap-3 bg-bg p-8">
                  <div className="text-xs font-bold tracking-[0.2em] text-muted">{step.n}</div>
                  <div className="text-lg font-bold tracking-tight">{step.title}</div>
                  <p className="text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Formats */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          <Reveal className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
            <span className="label">Speaks every format</span>
            {FORMATS.map((f) => (
              <span key={f} className="font-medium text-fg">{f}</span>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-line">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start gap-6 px-6 py-24 lg:py-32">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Start with the gallery. The rest follows.
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="flex flex-wrap items-center gap-3">
            <Button variant="solid" onClick={() => navigate('/gallery')}>
              Browse the gallery
              <ArrowRight size={15} strokeWidth={1.6} />
            </Button>
            <Button onClick={openDemo}>
              <PlayCircle size={15} strokeWidth={1.6} />
              View demo
            </Button>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-6 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>blur — a gallery, kit planner, and optics translator for photographers.</span>
          <span>Open source · self-hostable on Cloudflare.</span>
        </div>
      </footer>

      {videoOpen && <VideoModal onClose={() => setVideoOpen(false)} />}
    </div>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        {/* Non-linking wordmark: we are already home. */}
        <span className="text-lg font-bold tracking-tight">blur</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function HeroVisual({ photo }: { photo: GalleryItem | null }) {
  const reduce = useReducedMotion();
  if (!photo) {
    return (
      <div className="aspect-[4/5] w-full border border-line bg-faint" aria-hidden />
    );
  }
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full border border-line bg-faint"
    >
      <div className="aspect-[4/5] w-full overflow-hidden sm:aspect-[3/2] lg:aspect-[4/5]">
        <img src={thumbSrc(photo.src)} alt={photo.title} className="h-full w-full object-cover" />
      </div>
      <div className="flex items-baseline justify-between gap-3 border-t border-line px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{photo.title}</div>
          <div className="label mt-1 truncate">
            {photo.camera} · {photo.lens}
          </div>
        </div>
        <div className="label shrink-0 text-right">
          {formatLabel(photo.formatId)} · {Math.round(photo.focal)}mm · ƒ/{photo.aperture}
        </div>
      </div>
    </motion.div>
  );
}
