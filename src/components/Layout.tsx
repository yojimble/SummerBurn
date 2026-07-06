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
    <div className="min-h-screen flex flex-col bg-gradient-to-t from-white/80 to-transparent bg-background">
      <header className="border-b border-border sticky top-0 z-50 bg-[#08b9e3]/95 backdrop-blur supports-[backdrop-filter]:bg-[#08b9e3]/80">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-heading font-bold text-lg flex items-center gap-2">
              <img src="/logo-mascot.png" alt="" className="h-8 w-8 rounded-md object-cover" />
              <span className="text-[#fcea04]">Bitcoin Summer Burn</span>
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

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground bg-[#08b9e3]">
        <div className="container space-y-1">
          <p>Bitcoin Summer Burn 2026 — a Nostr music swap event</p>
          <p>
            <a
              href="https://soapbox.pub/mkstack"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 text-[#fcea04] hover:text-foreground transition-colors"
            >
              Vibed with MKStack
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
