import { useSeoMeta } from '@unhead/react';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { RSVPButton } from '@/components/RSVPButton';
import { AttendeeList } from '@/components/AttendeeList';
import { useRSVPs } from '@/hooks/useRSVPs';
import { Skeleton } from '@/components/ui/skeleton';
import { HASHTAG, EVENT_START_DATE } from '@/lib/summerBurn';

const EVENT_TARGET = new Date('2026-07-21T00:00:00');

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState(() => EVENT_TARGET.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(EVENT_TARGET.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (timeLeft <= 0) return null;

  const days = Math.floor(timeLeft / 86400000);
  const hours = Math.floor((timeLeft % 86400000) / 3600000);
  const minutes = Math.floor((timeLeft % 3600000) / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return { days, hours, minutes, seconds };
}

const Index = () => {
  useSeoMeta({
    title: 'Bitcoin Summer Burn 2026 — Nostr Music Swap',
    description:
      'A community music swap event on Nostr. Share your summer soundtrack, discover new music, and show off your cover art.',
  });

  const { data: rsvps, isLoading } = useRSVPs();
  const countdown = useCountdown();

  return (
    <Layout>
      {/* Hero */}
      <section className="py-20 px-4 text-center">
        <p className="text-5xl mb-6">🔥☀️💿⚡</p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
          Bitcoin Summer Burn 2026
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-2">
          Community music swap event on Nostr.
        </p>
        <p className="text-lg font-semibold text-foreground mb-4">
          Starts {EVENT_START_DATE}
        </p>
        {countdown ? (
          <div className="flex justify-center gap-4 mb-6">
            {[
              { value: countdown.days, label: 'days' },
              { value: countdown.hours, label: 'hours' },
              { value: countdown.minutes, label: 'mins' },
              { value: countdown.seconds, label: 'secs' },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center bg-background/70 rounded-xl px-4 py-2 min-w-[60px] shadow-sm border border-border">
                <span className="text-2xl font-bold tabular-nums">{String(value).padStart(2, '0')}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-primary font-bold text-lg mb-6">It's time to burn! 🔥</p>
        )}
        <p className="text-muted-foreground max-w-lg mx-auto mb-10 text-sm">
          A real physical CD swap, coordinated on Nostr. Make your mix, burn three copies,
          post them to strangers. Receive CDs in return. Share your tracklist and artwork here.
        </p>
        <RSVPButton />
      </section>

      {/* How it works */}
      <section className="container py-16 max-w-3xl">
        <h2 className="text-2xl font-bold mb-10 text-center">How it works</h2>
        <div className="grid sm:grid-cols-4 gap-6 text-center">
          <div className="space-y-3">
            <div className="text-4xl">✅</div>
            <h3 className="font-semibold">1. RSVP</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Log in with Nostr and click RSVP. On July 21st you'll get the addresses of your three recipients.
            </p>
          </div>
          <div className="space-y-3">
            <div className="text-4xl">💿</div>
            <h3 className="font-semibold">2. Burn your CDs</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Make three identical copies of your summer mix. Include a tracklist — cover art is preferred.
            </p>
          </div>
          <div className="space-y-3">
            <div className="text-4xl">📬</div>
            <h3 className="font-semibold">3. Post them out</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Send your CDs to your three recipients. Try to get them in the post within two weeks of July 21st.
            </p>
          </div>
          <div className="space-y-3">
            <div className="text-4xl">🎨</div>
            <h3 className="font-semibold">4. Share here</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Post your tracklist and cover art with{' '}
              <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">#{HASHTAG}</code> so everyone can see.
            </p>
          </div>
        </div>
      </section>

      {/* Spirit */}
      <section className="py-14 px-4">
        <div className="container max-w-2xl text-center space-y-4">
          <h2 className="text-xl font-bold">The Spirit of the Bitcoin Summer Burn</h2>
          <p className="text-muted-foreground leading-relaxed">
            Imagine yourself sitting in a field full of daisies and buttercups, troffing your way through a picnic
            and playing the odd game of croquet, while a Bitcoin Summer Burn mix plays. That's the vibe.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The Summer Burn started in 2005 as a physical CD swap — and that's exactly what this is.
            We're using Nostr to coordinate: RSVP, find your recipients, share your tracklist and artwork.
            Then burn your CDs and post them out just like always.
          </p>
        </div>
      </section>

      {/* Attendees */}
      <section className="container py-12 max-w-3xl">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-4 flex-wrap">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1 w-16">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
        ) : rsvps && rsvps.count > 0 ? (
          <AttendeeList events={rsvps.events} count={rsvps.count} />
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No Burners yet — be the first! 🔥
          </p>
        )}
      </section>
    </Layout>
  );
};

export default Index;
