<script lang="ts">
  import ProsePage from "$lib/components/ProsePage.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { PORTALS_ANNOUNCED } from "$lib/config/launch";
</script>

<Seo
  title="Privacy Policy - Tessil"
  description="What data Tessil handles, how long, and your GDPR rights. End-to-end encrypted file transfer."
  path="/privacy"
/>

<ProsePage
  title="Privacy Policy"
  tagline="End-to-end encrypted file transfer."
  updated="November 14, 2026"
  current="privacy"
>
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
              link's URL fragment - the fragment never reaches our servers.
            </p>
            <p class="text-muted-foreground">
              You can use Tessil anonymously or with an account. An account adds
              management features for the transfers you create - it doesn't change
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
              <li>Download counter and, if you set a password, a hash of a value derived from it in your browser (never the password itself)</li>
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
                token itself), the browser user-agent of each sign-in attempt and active session, the country and
                network operator derived from your IP address at that moment, and session expiry timestamps. We
                do not store the IP address itself; to recognise the same connection again we keep a keyed
                fingerprint of it that cannot be turned back into the address and becomes useless once its key
                is deleted.
              </li>
              <li>
                <strong>Account tier.</strong> Which plan the account is on.{#if PORTALS_ANNOUNCED}
                  {" "}For a paid plan, our payment provider tells us that a subscription exists and
                  when it renews or ends. We never receive your card details.{/if}
              </li>
              <li>
                <strong>Ownership link on transfers.</strong> Transfers you create while signed in are tagged with
                your account ID so they appear on your dashboard. Anonymous transfers carry no such link.
              </li>
            </ul>
            <p class="text-muted-foreground">
              Signing in doesn't change how files are encrypted. Your encryption key
              never reaches our servers - signed in or not.
            </p>

            {#if PORTALS_ANNOUNCED}
              <h3 class="text-lg font-medium text-foreground">Portals</h3>
              <p class="text-muted-foreground">
                A portal is a link through which other people send files to an account holder.
              </p>
              <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>
                  <strong>If you own a portal.</strong> We store that it exists and belongs to your
                  account, whether it is switched on, and when you last opened it. If you use
                  them, we also store its closing date, whether you want an email when files
                  arrive and when we last sent one, and a scrambled value that lets us check a
                  visitor knows the portal's password without our knowing the password. Its name,
                  its language, your texts, your logo, the list of documents you ask for and which
                  files you sent back through it are stored only in encrypted form that we cannot
                  read.
                </li>
                <li>
                  <strong>If you send files back through a portal.</strong> They are stored as a
                  transfer on your account, like any other you send.
                </li>
                <li>
                  <strong>If you switch on arrival emails.</strong> We email you, and anyone you
                  share the portal with, when files arrive. The email does not name the portal or
                  the files.
                </li>
                <li>
                  <strong>If you send files through a portal.</strong> You need no account and we do
                  not ask who you are. We store the encrypted files, their encrypted names, your
                  encrypted note and anything else the page asked you to fill in, also encrypted,
                  their sizes and when they arrived. Only the
                  portal's owner, and one person they may share it with, can decrypt them.
                </li>
                <li>
                  <strong>If you are invited to a portal.</strong> The owner gives us your email
                  address so we can send you the invitation and match it to your account. We keep
                  it with the invitation until it is accepted, declined or withdrawn.
                </li>
              </ul>
              <p class="text-muted-foreground">
                What people send through a portal may contain personal data about them or others.
                We cannot see it. The portal's owner decides what to ask for and what to do with
                it, and is responsible for that under data protection law; we store it on their
                behalf.
              </p>
            {/if}

            <h3 class="text-lg font-medium text-foreground">2.3 Security and Audit Data</h3>
            <p class="text-muted-foreground">
              To operate the service, prevent abuse, and meet legal recordkeeping needs, we process:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>
                Your IP address, in passing only: each request's address is turned into a keyed fingerprint for
                rate limiting and abuse prevention. The key rotates and the address itself is not stored in our
                database
              </li>
              <li>
                Authentication audit events (sign-in requests, sign-in successes, session revocations, transfer
                deletions, and account deletions) - stored for up to 90 days
              </li>
              <li>Basic server request logs (retained for up to 7 days for security purposes)</li>
              <li>
                Aggregated lifecycle counters per transfer (file count, total bytes, completion / expiry events) -                 kept indefinitely with no user attribution and used only for service statistics
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
              {#if PORTALS_ANNOUNCED}
                <li>
                  <strong>Files sent through a portal:</strong> Automatically deleted 30 days after they
                  arrive, or 90 days on the larger plan. The portal's owner can delete them sooner.
                  Deleting a portal or its owner's account deletes them as well.
                </li>
                <li>
                  <strong>Portal invitations:</strong> Deleted when accepted, declined or withdrawn.
                </li>
              {/if}
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
              The export does not contain the contents of your files - they are encrypted in your browser with a
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
            <h2 class="text-xl font-semibold text-foreground">7. Processors and Where Data Is Held</h2>
            <p class="text-muted-foreground">
              These are every third party that processes data on our behalf, what each one
              receives, and where it sits.
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>
                <strong>Hetzner (Germany):</strong> Runs the application server and its logs.
                Sees requests to the service. EU company, EU data centre.
              </li>
              <li>
                <strong>Scaleway Managed PostgreSQL (Amsterdam, Netherlands):</strong>
                The database holding account records, sessions, and transfer metadata. EU company,
                EU data centre.
              </li>
              <li>
                <strong>Scaleway Transactional Email (France):</strong> Sends one-time sign-in
                links and account notifications{#if PORTALS_ANNOUNCED}, including invitations to
                  a portal{/if}. Receives your email address and the message
                contents. Transactional mail only, never marketing.
              </li>
              {#if PORTALS_ANNOUNCED}
                <li>
                  <strong>Polar:</strong> Sells the paid plans as merchant of record. If you buy a
                  plan, Polar receives your email address and your payment details and issues your
                  invoice. We receive only whether a subscription exists and when it renews or ends.
                </li>
              {/if}
              <li>
                <strong>Cloudflare:</strong> Encrypted file storage (R2, restricted to the EU
                jurisdiction so objects stay in EU data centres), plus CDN and DDoS protection in
                front of the site. R2 only ever holds ciphertext. Because Cloudflare terminates
                TLS at its edge, it can see request metadata and your session cookie, but never
                your decryption key, which stays in the link fragment and is never transmitted.
              </li>
            </ul>
            <p class="text-muted-foreground">
              Cloudflare Inc. is headquartered in the United States, so we do not claim to be
              beyond the reach of US law. We claim something narrower: your file contents are
              encrypted in your browser before upload and the key never reaches any server, ours
              or Cloudflare's. A legal order served on Cloudflare produces encrypted data and
              metadata, not your files. This transfer relies on Cloudflare's standard data
              processing terms and its EU data localisation options.
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
</ProsePage>
