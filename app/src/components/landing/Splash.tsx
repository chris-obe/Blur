import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';

export type SplashStatus = 'pending' | 'authed' | 'anon';

interface Props {
  status: SplashStatus;
  name?: string | null;
  onFinish: () => void;
}

type Line = 'checking' | 'found' | 'welcome' | 'loading';

// Cold-load splash: the wordmark resolves from defocus to sharp while Auth0
// rehydrates the session, then plays a short status line. Authenticated users
// get the "welcome back → loading" beat before the gate redirects them in;
// anonymous users get a brief hold, then the landing cross-fades in.
export function Splash({ status, name, onFinish }: Props) {
  const reduce = useReducedMotion();
  const [line, setLine] = useState<Line>('checking');
  const started = useRef(false);

  useEffect(() => {
    if (status === 'pending' || started.current) return;
    started.current = true;

    if (reduce) {
      onFinish();
      return;
    }

    if (status === 'authed') {
      const timers = [
        window.setTimeout(() => setLine('found'), 260),
        window.setTimeout(() => setLine('welcome'), 820),
        window.setTimeout(() => setLine('loading'), 1640),
        window.setTimeout(onFinish, 2320),
      ];
      return () => timers.forEach(clearTimeout);
    }

    // Anonymous: hold long enough that the focus-in reads, then hand off.
    const timer = window.setTimeout(onFinish, 780);
    return () => window.clearTimeout(timer);
  }, [status, reduce, onFinish]);

  const greeting = name ? `Welcome back, ${name}.` : 'Welcome back.';
  const message: Record<Line, string> = {
    checking: 'Checking your session',
    found: 'Signed in',
    welcome: greeting,
    loading: 'Loading your workspace',
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-bg text-fg">
      <span className="splash-word text-5xl font-bold tracking-tight sm:text-6xl">blur</span>

      <div className="flex h-5 items-center justify-center text-xs uppercase tracking-[0.18em] text-muted">
        <AnimatePresence mode="wait">
          <motion.span
            key={status === 'pending' ? 'checking' : line}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2"
          >
            {line === 'found' && status === 'authed' && <Check size={13} strokeWidth={2} />}
            {status === 'pending' ? message.checking : message[line]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
