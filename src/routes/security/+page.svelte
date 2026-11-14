<script lang="ts">
  import ProsePage from "$lib/components/ProsePage.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { PORTALS_ANNOUNCED } from "$lib/config/launch";
</script>

<Seo
  title="Security Overview - Tessil"
  description="How Tessil's encryption works, what we can and cannot see, and how to report vulnerabilities."
  path="/security"
/>

<ProsePage
  title="Security Overview"
  tagline="How end-to-end encryption works on Tessil, and how to report a vulnerability."
  updated="November 13, 2026"
  current="security"
>
          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">Scope</h2>
            <p class="text-muted-foreground">
              Tessil is an end-to-end encrypted file transfer service. This
              page is the security model: what we can and cannot access, how keys
              are handled, and how to report a vulnerability.
            </p>
            <p class="text-muted-foreground">
              This page describes what we do. If you would rather check than
              read, <a
                href="/verify"
                class="text-primary underline underline-offset-2"
                >verify it yourself</a
              > walks through four checks you can run against the live site in about
              two minutes.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Encryption model</h2>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Files, filenames, and the optional transfer title are encrypted in your browser with AES-256-GCM before upload</li>
              <li>The encryption key is generated client-side and lives in the URL fragment (the part after <code>#</code>)</li>
              <li>Browsers don't send URL fragments to servers - the key stays in your browser</li>
              <li>An optional transfer password locks the key inside the link and gates server-side access. The password stays in your browser; we receive only a value derived from it, which cannot unlock the link</li>
              <li>Transfers are deleted automatically when they expire</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Sharing links safely</h2>
            <p class="text-muted-foreground">
              The decryption key lives in the URL fragment - the part after
              <code>#</code>. Browsers never send fragments to servers; the key
              stays local.
            </p>
            <p class="text-muted-foreground">
              The full URL (fragment included) can still land in browser
              history, browser sync, and bookmarks. Anyone with access to your
              browser can read a saved link and decrypt the files unless you
              set a password.
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Share links through trusted, private channels (Signal, encrypted email)</li>
              <li>Set a transfer password for sensitive files - a second factor beyond the link</li>
              <li>Use a private/incognito window if you don't want the link in browser history</li>
              <li>Pick the shortest expiry that still works for your recipient</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">What we can see</h2>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Encrypted file blobs, encrypted filenames, and the encrypted transfer title (when set)</li>
              <li>Transfer metadata: size, expiry, timestamps</li>
              <li>Operational metadata needed for abuse handling and rate limiting</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">What we cannot see</h2>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>File contents</li>
              <li>Original filenames</li>
              <li>The plaintext transfer title</li>
              <li>Your decryption key</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Safeguards</h2>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>HTTPS/TLS in transit</li>
              <li>All cryptography runs in your browser before bytes reach the network</li>
              <li>Accounts are optional - anonymous transfers are first-class</li>
              <li>No third-party analytics or tracking SDKs</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Optional Accounts</h2>
            <p class="text-muted-foreground">
              Sign in to manage your transfers from one place. Sign-in is
              optional. Accounts use magic-link email or a device-bound
              passkey - no password to remember, lose, or breach.
              <strong>Accounts don't weaken the encryption model:</strong>
              file payloads stay end-to-end encrypted signed in or not, and
              the encryption key still lives only in the URL fragment.
            </p>
            <p class="text-muted-foreground">When you have an account we store:</p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Your email address (for sign-in)</li>
              <li>Your account tier (currently free)</li>
              <li>A hashed session token for as long as you stay signed in</li>
              <li>The browser user-agent at sign-in time, for context in your sign-in email</li>
              <li>Authentication events (sign-in requests, successes, sign-outs) - kept for 90 days then automatically deleted</li>
            </ul>
            <p class="text-muted-foreground">
              <strong>We don't store IP addresses.</strong> For sign-in events
              we record the country and the network operator (ASN) derived
              from your IP at the moment of the request, plus a rotating
              cryptographic identifier that lets us correlate suspicious
              activity within a 24-hour window without retaining the
              underlying address. The identifier is keyed against a secret
              we rotate on a 30-day schedule, after which prior events
              become permanently uncorrelatable.
            </p>
            <p class="text-muted-foreground">
              This applies to every auth-related event. Country and ASN
              resolution uses MaxMind GeoLite2 loaded locally on our servers;
              no per-request data leaves the box for this lookup.
            </p>
            <p class="text-muted-foreground">
              The magic-link token and your session cookie are never written
              to the database in plaintext - both are SHA-256 hashed first.
              Sign-in links expire after 15 minutes and work once.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Sign-in codes and anti-phishing</h2>
            <p class="text-muted-foreground">
              Open a sign-in link on a different device than the one you
              started on, and Tessil shows you a 6-digit code instead of
              signing you in there. Type the code back on the device where
              you started.
            </p>
            <p class="text-muted-foreground">
              <strong>Tessil will never ask you to share that code.</strong>
              We will never email, call, or message you to request a
              sign-in code. If anyone - claiming to be Tessil support, a
              friend, a delivery service - asks for the code, it's a phishing
              attempt. Don't share it.
            </p>
            <p class="text-muted-foreground">
              The code shows only on the device that opened the link. Never
              in the email itself, never in any other communication from us.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Passkeys</h2>
            <p class="text-muted-foreground">
              If your device supports it, add a passkey to skip the email
              round-trip on sign-in. A passkey is a cryptographic key pair
              generated and stored by your device's authenticator - Touch
              ID, Face ID, Windows Hello, a hardware security key, or a
              synced credential from your platform's password manager.
            </p>
            <p class="text-muted-foreground">
              <strong>Passkeys are bound to this site's domain.</strong> Your
              browser only releases a Tessil passkey to Tessil - it
              can't be used on a look-alike site, even one that copies our
              design pixel-for-pixel. The browser enforces this (the
              WebAuthn standard), not us. It's why passkeys resist phishing
              in a way that passwords and one-time codes cannot.
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>The private key never leaves your device (or your platform's secure sync, if you opt in)</li>
              <li>We store only a public key, a credential identifier, and basic device info</li>
              <li>Add, rename, and remove passkeys from your account settings at any time</li>
              <li>Passkeys don't replace email sign-in - both stay available, so a lost device doesn't lock you out</li>
              <li>A passkey can also open your vault, if you choose that. See the vault section below</li>
            </ul>
            <p class="text-muted-foreground">
              Passkeys don't change the encryption model. File payloads stay
              end-to-end encrypted, the encryption key still lives only in
              the URL fragment, and signing in with a passkey only
              authenticates you to Tessil - it doesn't give us access to
              your transfers' contents.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">The vault (optional)</h2>
            <p class="text-muted-foreground">
              An account works without a vault: you can sign in and send, and
              your dashboard lists what you sent by size and date. A vault adds
              the two things we cannot keep for you in readable form: the names
              of what you sent, and the links to it.
            </p>
            <p class="text-muted-foreground">
              When you set one up, your browser generates a random vault key
              (<em>K<sub>vault</sub></em>). It never reaches our servers. We
              store only copies of it that are locked, each under something
              only you have:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>a 12-word recovery phrase, always, as your offline backup</li>
              <li>a vault password, if you choose one, stretched with Argon2id in your browser</li>
              <li>a passkey, if your device supports it, using a secret only that passkey can produce</li>
            </ul>
            <p class="text-muted-foreground">
              Any one of them opens the vault. We never see the phrase, the
              password or the passkey's secret, so none of them can be
              recovered from us. If you lose all of them, what the vault
              protects is gone.
            </p>
            <p class="text-muted-foreground">
              When you send while signed in with the vault open, your browser
              locks that transfer's key under the vault key and stores the
              locked copy with us. That is how the dashboard can show names
              and rebuild a link later. The vault also holds a key pair for
              your account: we store the public half, and the private half
              only in locked form.
            </p>
            <p class="text-muted-foreground">
              The vault stays open on a device for up to 24 hours, then asks
              again. You can lock it from the account menu at any time, which
              drops the key from memory immediately.
            </p>
            <p class="text-muted-foreground">
              <strong>What this protects:</strong> anyone who can open your
              vault can see the names and links of your past transfers. The
              files themselves are always encrypted under a separate key per
              transfer, carried in the share link.
            </p>
          </section>

          {#if PORTALS_ANNOUNCED}
            <section class="space-y-3" id="portals">
              <h2 class="text-lg font-semibold text-foreground">Portals</h2>
              <p class="text-muted-foreground">
                A portal is a link through which other people send files to
                you. It uses the same idea as a transfer, turned around: the
                sender's browser encrypts, and only your browser can decrypt.
              </p>
              <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Each portal has its own key pair, made in your browser. The private key is kept in your vault and never reaches us in readable form</li>
                <li>The portal link carries a second key in its fragment. It unlocks the portal's name, its list of requested documents and its public key in the sender's browser. We store those only in locked form, so we can neither read them nor swap the public key for one of our own</li>
                <li>A sender's browser encrypts each file, its name and the optional note with a fresh key, and locks that key so only the portal's private key can open it. The sender cannot read their own delivery back afterwards, and neither can other senders</li>
                <li>Senders need no account. We do not ask who they are</li>
                <li>Deliveries are deleted automatically after the period your plan sets, and earlier if you delete them</li>
              </ul>
              <p class="text-muted-foreground">
                <strong>Sharing a portal.</strong> You can give one other
                account access. Your browser hands that account the portal's
                keys, locked to their public key and signed with yours, so
                their browser accepts them only if they came from you. The
                step we cannot prove for you is that a public key really
                belongs to the person you mean. That is what the two short
                codes on the sharing screen are for: if both of you see the
                same codes, nobody replaced a key on the way. If you skip the
                comparison, you are trusting our server for that one step.
              </p>
              <p class="text-muted-foreground">
                <strong>What we can see about a portal:</strong> that it
                exists and who owns it, whether it is switched on, when
                deliveries arrive, how many files they hold and how large
                they are, the email address you invite, and when you last
                opened it. Not its name, not what you ask for, not the notes,
                the file names or the files.
              </p>
            </section>
          {/if}

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Responsible disclosure</h2>
            <p class="text-muted-foreground">
              Found a security vulnerability? Report it privately so we can
              fix it before public disclosure.
            </p>
            <p class="text-muted-foreground">
              <a
                href="mailto:security@tessil.app"
                class="text-primary underline underline-offset-2"
              >security@tessil.app</a>
            </p>
            <p class="text-sm text-muted-foreground">
              Include reproduction steps, affected URLs, and impact.
              Acknowledgement within 72 hours.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Attributions</h2>
            <p class="text-sm text-muted-foreground">
              Country and ASN lookups use GeoLite2 data created by MaxMind,
              available from
              <a
                href="https://www.maxmind.com"
                rel="noopener noreferrer"
                class="text-primary underline underline-offset-2"
              >maxmind.com</a>. The databases are loaded locally on our servers -               no per-request data is sent to MaxMind.
            </p>
          </section>
</ProsePage>
