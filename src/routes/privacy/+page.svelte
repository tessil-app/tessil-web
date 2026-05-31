<script lang="ts">
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
</script>

<svelte:head>
  <title>Privacy Policy - Tessil</title>
  <meta
    name="description"
    content="What data Tessil handles, how long, and your GDPR rights. End-to-end encrypted file transfer."
  />
  <meta name="robots" content="index, follow" />
  <meta property="og:title" content="Privacy Policy - Tessil" />
  <meta
    property="og:description"
    content="Tessil privacy policy for end-to-end encrypted file transfer."
  />
</svelte:head>

<PageLayout width="3xl">
  <PageHeader
    title="Privacy Policy"
    tagline="End-to-end encrypted file transfer."
  />

    <Frame.Root>
      <Frame.Panel>
        <div class="space-y-6">
          <p class="text-sm text-muted-foreground">Last updated: May 12, 2026</p>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p class="text-muted-foreground">
              Tessil ("we", "our", "us") is an end-to-end encrypted file transfer
              service. This page explains what data we handle when you use the
              service at tessil.app.
            </p>
            <p class="text-muted-foreground">
              Your files are unreadable to us by design. They're encrypted in your
              browser before upload, and the decryption key lives in the share
              link's URL fragment — the fragment never reaches our servers.
            </p>
            <p class="text-muted-foreground">
              You can use Tessil anonymously or with an account. An account adds
              management features for the transfers you create — it doesn't change
              how files are encrypted.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">2. Data We Collect</h2>

            <h3 class="text-lg font-medium text-foreground">2.1 Transfer Data (Encrypted)</h3>
            <p class="text-muted-foreground">
              When you upload files, they are encrypted in your browser before being sent to our servers. We store:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Encrypted file data (we cannot decrypt this)</li>
              <li>Encrypted file names (we cannot decrypt this)</li>
              <li>File size, MIME type, and upload timestamp</li>
              <li>Expiration date you selected</li>
              <li>Download counter and optional password hash (if you set one)</li>
            </ul>
            <p class="text-muted-foreground">
              The encryption key is generated in your browser and lives only in the
              share link's URL fragment. We never receive or store the key. We
              cannot decrypt your files.
            </p>

            <h3 class="text-lg font-medium text-foreground">2.2 Account Data (Only If You Sign In)</h3>
            <p class="text-muted-foreground">
              Accounts are optional. If you choose to sign in, we collect the following:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>
                <strong>Email address.</strong> Used as the sign-in identifier. Stored in lowercase, indexed for
                uniqueness, and used to send you a one-time sign-in link.
              </li>
              <li>
                <strong>Sign-in records.</strong> Hashed sign-in tokens (we store only the SHA-256 hash, never the
                token itself), the IP address and browser user-agent of each sign-in attempt and active session, and
                session expiry timestamps.
              </li>
              <li>
                <strong>Account tier.</strong> Currently always <code>free</code>.
              </li>
              <li>
                <strong>Ownership link on transfers.</strong> Transfers you create while signed in are tagged with
                your account ID so they appear on your dashboard. Anonymous transfers carry no such link.
              </li>
            </ul>
            <p class="text-muted-foreground">
              Signing in doesn't change how files are encrypted. Your encryption key
              never reaches our servers — signed in or not.
            </p>

            <h3 class="text-lg font-medium text-foreground">2.3 Security and Audit Data</h3>
            <p class="text-muted-foreground">
              To operate the service, prevent abuse, and meet legal recordkeeping needs, we process:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>IP addresses (for rate limiting and abuse prevention)</li>
              <li>
                Authentication audit events (sign-in requests, sign-in successes, session revocations, transfer
                deletions, and account deletions) — stored for up to 90 days
              </li>
              <li>Basic server request logs (retained for up to 7 days for security purposes)</li>
              <li>
                Aggregated lifecycle counters per transfer (file count, total bytes, completion / expiry events) —
                kept indefinitely with no user attribution and used only for service statistics
              </li>
            </ul>

            <h3 class="text-lg font-medium text-foreground">2.4 Data We Do NOT Collect</h3>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>We don't collect your email address unless you create an account</li>
              <li>We don't use tracking cookies, analytics scripts, or marketing pixels</li>
              <li>We don't sell or share data with third parties for advertising</li>
              <li>We have no access to the contents or names of your files</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">3. How We Use Your Data</h2>
            <p class="text-muted-foreground">We use this data to:</p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Provide the file transfer service</li>
              <li>Send one-time sign-in links and account-related notifications (e.g. confirming an account deletion)</li>
              <li>Keep your dashboard in sync with the transfers you own</li>
              <li>Enforce rate limits to ensure fair usage</li>
              <li>Protect against abuse and maintain service security</li>
              <li>Automatically delete files after expiration</li>
            </ul>
            <p class="text-muted-foreground">
              We do not use your data for advertising, profiling, or any form of automated decision-making with
              legal or similarly significant effects.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">4. Data Storage & Security</h2>
            <p class="text-muted-foreground">
              Encrypted files are stored on Cloudflare R2 within the European Union.
              Account metadata and audit records are stored in a PostgreSQL database
              within the European Union. Security measures:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>End-to-end encryption (AES-256-GCM) for all file contents and filenames</li>
              <li>TLS/HTTPS for all data in transit</li>
              <li>Automatic file deletion after 1, 6, 12, 24, or 72 hours (based on your selection)</li>
              <li>Sign-in tokens stored only as SHA-256 hashes (we cannot recover the original token)</li>
              <li>Server-side session cookies marked <code>HttpOnly</code>, <code>Secure</code>, and <code>SameSite</code></li>
              <li>No permanent storage of file contents</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">5. Data Retention</h2>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li><strong>Uploaded files:</strong> Automatically deleted after 1, 6, 12, 24, or 72 hours (your choice)</li>
              <li>
                <strong>Account record:</strong> Retained as long as your account exists. Deleted immediately and
                irreversibly when you delete your account from the dashboard.
              </li>
              <li>
                <strong>Sign-in tokens (magic links):</strong> Valid for 15 minutes, single-use, then deleted.
              </li>
              <li>
                <strong>Active sessions:</strong> Up to 30 days of inactivity (sliding) and a 90-day hard cap from
                first sign-in. Revoked sessions are deleted on next cleanup.
              </li>
              <li>
                <strong>Authentication audit events:</strong> Retained for 90 days, then automatically deleted.
              </li>
              <li><strong>Rate limit data:</strong> Automatically expires after the rate limit window (up to 30 days)</li>
              <li><strong>Server logs:</strong> Retained for up to 7 days, then automatically deleted</li>
              <li>
                <strong>Aggregated lifecycle counters:</strong> Retained indefinitely. They contain no personal
                data and no user attribution.
              </li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">6. Your Rights (GDPR)</h2>
            <p class="text-muted-foreground">
              Under the General Data Protection Regulation (GDPR), you have the right to:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate personal data</li>
              <li>Request deletion of your data ("right to erasure")</li>
              <li>Object to or restrict certain processing of your data</li>
              <li>Receive a copy of your data in a portable format</li>
              <li>Lodge a complaint with your local data protection supervisory authority</li>
            </ul>
            <p class="text-muted-foreground">
              <strong>Self-service deletion.</strong> If you have an account, you can delete it at any time from
              <a href="/dashboard/settings" class="text-primary underline underline-offset-2">Settings → Danger zone</a>.
              Deletion is immediate and permanent: your account, all transfers you own, every active session, and
              any pending sign-in links are erased, and the email column on historical audit records is scrubbed.
              We send a confirmation email to your former address once the deletion completes.
            </p>
            <p class="text-muted-foreground">
              <strong>Self-service data export.</strong> You can download a JSON copy of your account record,
              recent sign-in activity, and the metadata of the transfers you own from
              <a href="/dashboard/settings" class="text-primary underline underline-offset-2">Settings → Your data</a>.
              The export does not contain the contents of your files — they are encrypted in your browser with a
              key we never receive.
            </p>
            <p class="text-muted-foreground">
              <strong>Anonymous transfers</strong> are not tied to an account. The only way to remove them before
              their expiry is to wait for them to expire automatically, or to email us with the transfer ID at the
              contact address below.
            </p>
            <p class="text-muted-foreground">
              For any other GDPR request, contact us at the address in section 9. We respond within one month, as
              required by Article 12(3).
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">7. Third-Party Services</h2>
            <p class="text-muted-foreground">We use the following third-party services:</p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li><strong>Cloudflare:</strong> CDN, DDoS protection, and R2 object storage (EU region)</li>
              <li>
                <strong>Scaleway Transactional Email (TEM):</strong> Sends one-time sign-in links and
                account-related notifications. Receives your email address and the message contents. EU-based
                processor; used for transactional mail only — never marketing.
              </li>
            </ul>
            <p class="text-muted-foreground">
              These services may process personal data as part of their normal operations.
              Please refer to their respective privacy policies for more information.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">8. Changes to This Policy</h2>
            <p class="text-muted-foreground">
              We may update this policy. Material changes are reflected in the
              "Last updated" date at the top of this page.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">9. Contact</h2>
            <p class="text-muted-foreground">
              Questions about this policy or our data practices:
            </p>
            <p class="text-muted-foreground">
              <a href="mailto:privacy@tessil.app" class="text-primary underline underline-offset-2">privacy@tessil.app</a>
            </p>
          </section>
        </div>
      </Frame.Panel>
    </Frame.Root>

  <SiteFooter current="privacy" />
</PageLayout>
