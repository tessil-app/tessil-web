<script lang="ts">
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
</script>

<svelte:head>
  <title>Security Overview - Tessil</title>
  <meta
    name="description"
    content="How Tessil's encryption works, what we can and cannot see, and how to report vulnerabilities."
  />
  <meta name="robots" content="index, follow" />
  <meta property="og:title" content="Security Overview - Tessil" />
  <meta
    property="og:description"
    content="How end-to-end encryption works on Tessil, what we can and cannot access, and how to report a vulnerability."
  />
</svelte:head>

<PageLayout width="3xl">
  <PageHeader
    title="Security Overview"
    tagline="How end-to-end encryption works on Tessil, and how to report a vulnerability."
  />

    <Frame.Root>
      <Frame.Panel>
        <div class="space-y-6">
          <p class="text-sm text-muted-foreground">Last updated: May 14, 2026</p>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">Scope</h2>
            <p class="text-muted-foreground">
              Tessil is an end-to-end encrypted file transfer service. This
              page is the security model: what we can and cannot access, how keys
              are handled, and how to report a vulnerability.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Encryption model</h2>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Files, filenames, and the optional transfer title are encrypted in your browser with AES-256-GCM before upload</li>
              <li>The encryption key is generated client-side and lives in the URL fragment (the part after <code>#</code>)</li>
              <li>Browsers don't send URL fragments to servers — the key stays in your browser</li>
              <li>An optional transfer password gates server-side access, independent of the encryption key</li>
              <li>Transfers are deleted automatically when they expire</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Sharing links safely</h2>
            <p class="text-muted-foreground">
              The decryption key lives in the URL fragment — the part after
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
              <li>Set a transfer password for sensitive files — a second factor beyond the link</li>
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
              <li>Accounts are optional — anonymous transfers are first-class</li>
              <li>No third-party analytics or tracking SDKs</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Optional Accounts</h2>
            <p class="text-muted-foreground">
              Sign in to manage your transfers from one place. Sign-in is
              optional. Accounts use magic-link email or a device-bound
              passkey — no password to remember, lose, or breach.
              <strong>Accounts don't weaken the encryption model:</strong>
              file payloads stay end-to-end encrypted signed in or not, and
              the encryption key still lives only in the URL fragment.
            </p>
            <p class="text-muted-foreground">When you have an account we store:</p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Your email address (for sign-in)</li>
              <li>Your tier (free or paid)</li>
              <li>A hashed session token for as long as you stay signed in</li>
              <li>The browser user-agent at sign-in time, for context in your sign-in email</li>
              <li>Authentication events (sign-in requests, successes, sign-outs) — kept for 90 days then automatically deleted</li>
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
              to the database in plaintext — both are SHA-256 hashed first.
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
              sign-in code. If anyone — claiming to be Tessil support, a
              friend, a delivery service — asks for the code, it's a phishing
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
              generated and stored by your device's authenticator — Touch
              ID, Face ID, Windows Hello, a hardware security key, or a
              synced credential from your platform's password manager.
            </p>
            <p class="text-muted-foreground">
              <strong>Passkeys are bound to this site's domain.</strong> Your
              browser only releases a Tessil passkey to Tessil — it
              can't be used on a look-alike site, even one that copies our
              design pixel-for-pixel. The browser enforces this (the
              WebAuthn standard), not us. It's why passkeys resist phishing
              in a way that passwords and one-time codes cannot.
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>The private key never leaves your device (or your platform's secure sync, if you opt in)</li>
              <li>We store only a public key, a credential identifier, and basic device info</li>
              <li>Add, rename, and remove passkeys from your account settings at any time</li>
              <li>Passkeys don't replace email sign-in — both stay available, so a lost device doesn't lock you out</li>
            </ul>
            <p class="text-muted-foreground">
              Passkeys don't change the encryption model. File payloads stay
              end-to-end encrypted, the encryption key still lives only in
              the URL fragment, and signing in with a passkey only
              authenticates you to Tessil — it doesn't give us access to
              your transfers' contents.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Vault for signed-in transfers</h2>
            <p class="text-muted-foreground">
              When you upload while signed in, your browser wraps the
              transfer's encryption key under a per-account vault key
              (<em>K<sub>vault</sub></em>) before sending the wrapped blob
              to us. The vault key itself never touches our servers — it
              is derived in your browser from your vault password using
              Argon2id, and we only store the resulting wrapped blob.
            </p>
            <p class="text-muted-foreground">
              On first sign-in you set a vault password and we generate a
              12-word recovery phrase for you to save somewhere safe. Both
              independently unwrap the vault key: the password is what you
              type day to day, the phrase is your offline backup if you
              forget the password. We never see either one in plaintext,
              so neither can be recovered from us if you lose them.
            </p>
            <p class="text-muted-foreground">
              The vault unlocks once and stays unlocked on this device for
              up to 24 hours, after which you'll be prompted to enter your
              vault password again. You can also lock the vault manually
              from the account menu, which drops the in-memory key
              immediately.
            </p>
            <p class="text-muted-foreground">
              <strong>What this protects:</strong> the dashboard can show
              filenames and rebuild share links for past transfers without
              keeping any of that information on our servers. Anyone with
              your account password (or your recovery phrase) gets that
              same capability — the underlying file payload itself is
              always end-to-end encrypted under a per-transfer key carried
              in the share link's URL fragment, separate from the vault.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Responsible disclosure</h2>
            <p class="text-muted-foreground">
              Found a security vulnerability? Report it privately so we can
              fix it before public disclosure.
            </p>
            <p class="text-muted-foreground">
              <a
                href="mailto:security@tessil.app"
                class="text-primary hover:underline"
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
                class="text-primary hover:underline"
              >maxmind.com</a>. The databases are loaded locally on our servers —
              no per-request data is sent to MaxMind.
            </p>
          </section>
        </div>
      </Frame.Panel>
    </Frame.Root>

  <SiteFooter current="security" />
</PageLayout>
