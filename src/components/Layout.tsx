import { Link, useLocation } from 'react-router-dom';
import { LoginArea } from '@/components/auth/LoginArea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';

const baseLinks = [
  { to: '/', label: 'Home' },
  { to: '/feed', label: 'Feed' },
  { to: '/forum', label: 'Forum' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/faq', label: 'FAQ' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useCurrentUser();
  const navLinks = user ? [...baseLinks, { to: '/account', label: 'My Account' }] : baseLinks;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50 to-background dark:from-amber-950/20">
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-bold text-lg flex items-center gap-1.5">
              <span>🔥</span>
              <span className="text-primary">Bitcoin Summer Burn</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    location.pathname === to
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <LoginArea className="max-w-48" />
        </div>
        {/* Mobile nav */}
        <nav className="sm:hidden flex border-t border-border">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex-1 py-2 text-xs font-medium text-center transition-colors',
                location.pathname === to
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <div className="container space-y-1">
          <p>Bitcoin Summer Burn 2026 — a Nostr music swap event</p>
          <p>
            <a
              href="https://soapbox.pub/mkstack"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Vibed with MKStack
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
