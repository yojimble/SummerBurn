import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ZapButton } from '@/components/ZapButton';
import { HASHTAG, EVENT_START_DATE } from '@/lib/summerBurn';

const RIGHT_SAID_FRED_PUBKEY = '56cadbc821999f0385267ef6d3dfba1098774b3a033a610e9f23f894ff580022';

interface QAProps {
  q: string;
  a: React.ReactNode;
}

function QA({ q, a }: QAProps) {
  return (
    <div className="space-y-2">
      <p className="font-semibold text-foreground">Q: {q}</p>
      <div className="text-muted-foreground leading-relaxed">A: {a}</div>
    </div>
  );
}

const FAQ = () => {
  useSeoMeta({
    title: 'FAQ — Bitcoin Summer Burn 2026',
    description: 'Everything you need to know about Bitcoin Summer Burn 2026.',
  });

  return (
    <Layout>
      <div className="container max-w-2xl py-12">
        <h1 className="text-3xl font-bold mb-2">Bitcoin Summer Burn 2026 FAQ</h1>
        <p className="text-muted-foreground mb-10">
          Everything you need to know. Probably.
        </p>

        <div className="space-y-8">
          <QA
            q="What type of music should I share?"
            a={
              <>
                The Bitcoin Summer Burn is all about sharing music you love listening to during Summer. Try to imagine
                yourself sitting in a field full of daisies and buttercups, troffing your way through a picnic and
                playing the odd game of croquet. If you think New Age Whalesong sounds summery, by all means share
                it. But spare a thought for the people who'll be listening.
              </>
            }
          />

          <QA
            q="How do I participate?"
            a={
              <>
                RSVP on this site using your Nostr account. On {EVENT_START_DATE} you'll receive the names and
                addresses of three recipients — burn three copies of your summer mix CD and post one to each of them.
                You'll also receive three CDs from other Burners. Use Nostr (tagged{' '}
                <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">#{HASHTAG}</code>) to share
                your tracklist, cover art, and chat with fellow Burners while you wait for the post to arrive.
              </>
            }
          />

          <QA
            q="How does the anonymous matching work?"
            a={
              <>
                When you RSVP, the site generates a fresh anonymous keypair just for you — a separate Nostr
                identity that has nothing to do with your real account. This anon keypair is what your recipients
                see when they receive their match; they know a CD is coming from someone in the swap, but they
                don't know it's you unless you choose to tell them.
                <br /><br />
                Your postal address is sent as an encrypted DM <em>to your recipients' anon keypairs</em>, so
                it's never publicly linked to your real Nostr identity. The only person who ever sees the
                connection between your real account and your anon keypair is the organiser, who needs it to
                send you your match.
                <br /><br />
                The anon keypair is stored in your browser. Don't clear your local storage before the swap is
                done — you need it to receive your match and read your address DMs.
              </>
            }
          />

          <QA
            q="What's Nostr and how do I log in?"
            a={
              <>
                Nostr is a decentralised social protocol. To participate you'll need a Nostr account and a way
                to sign in securely. The easiest option is a NIP-07 browser extension like{' '}
                <a href="https://getalby.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                  Alby
                </a>{' '}
                or{' '}
                <a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                  nos2x
                </a>
                — install it, then click Join and log in with one tap. You can also use a remote signer.
              </>
            }
          />


          <QA
            q="Do I really need to RSVP?"
            a={
              <>
                Yes please! RSVPing is what makes your posts appear in the feed here. Anyone can post with
                {' '}<code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">#{HASHTAG}</code>{' '}
                on Nostr, but only RSVPed Burners will show up in this community feed. It's also how we know
                who's in — and how many people we're burning with this year.
              </>
            }
          />


          <QA
            q="Should I make cover art?"
            a={
              <>
                We'd love it if you did. Part of the fun of the Bitcoin Summer Burn is making the complete package —
                some Burners spend more time on the cover artwork than curating the actual playlist. Upload yours
                to the Gallery and show it off. That said, it's not compulsory. The minimum we ask is a written
                or printed tracklist so recipients know what they're listening to.
              </>
            }
          />

          <QA
            q="I live in Venezuela. Will people there see my posts?"
            a={
              <>
                Nostr is global and decentralised, so yes — anyone anywhere can see your posts. One of the great
                things about the Bitcoin Summer Burn is discovering music from people in other countries. You might find
                something you'd never have heard of otherwise. Ask your post office about the cheapest option for sending a CD abroad — you might be surprised.
              </>
            }
          />

          <QA
            q="I'm in the Southern Hemisphere. It's winter here."
            a="Yes, alright, Mr Genius!"
          />

          <QA
            q="When does it start?"
            a={
              <>
                {EVENT_START_DATE}. RSVP before then and get your mix ready. On the day, your CD partners will
                be revealed — burn your copies, take them to the post office, and share your tracklist and
                cover art here on Nostr.
              </>
            }
          />

          <QA
            q="What if someone RSVPs but never sends their CD?"
            a={
              <>
                That would be a bit rubbish, wouldn't it? Three people are counting on receiving a CD from you.
                If you sign up, you commit to burning and posting your copies. If something comes up, please
                un-RSVP before matching day so we can plan around it. Don't be that person.
              </>
            }
          />

          <QA
            q="Can I post a Spotify/Youtube playlist instead?"
            a={
              <>
                No. Fuck them. This swap is for physical pirated audio CD only. Zap artists as they join Nostr
                — like{' '}
                <a
                  href="https://nostr.me/npub12m9dhjppnx0s8pfx0mmd8ha6zzv8wje6qvaxzr5ly0uffl6cqq3qxmwx3c"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Right Said Fred
                </a>
                .{' '}
                <ZapButton pubkey={RIGHT_SAID_FRED_PUBKEY} label="Right Said Fred" />
              </>
            }
          />

          <QA
            q="I've just RSVP'd and I'm already giddy with excitement."
            a="That's the spirit. Welcome to the Burn. 🔥"
          />

          <QA
            q="I still have questions."
            a={
              <>
                Head to the{' '}
                <Link to="/forum" className="underline underline-offset-2 hover:text-foreground">
                  forum
                </Link>{' '}
                and ask — other Burners there will be happy to help.
              </>
            }
          />
        </div>
      </div>
    </Layout>
  );
};

export default FAQ;
