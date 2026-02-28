<script lang="ts">
  import * as Frame from "$lib/components/frame";
</script>

<svelte:head>
  <title>Privacy Policy - JTransfer</title>
  <meta
    name="description"
    content="Read how JTransfer handles data, encryption, retention, and GDPR rights for secure file sharing and local image conversion."
  />
  <meta name="robots" content="index, follow" />
  <meta property="og:title" content="Privacy Policy - JTransfer" />
  <meta
    property="og:description"
    content="JTransfer privacy policy for encrypted file sharing and browser-local image conversion."
  />
</svelte:head>

<div class="min-h-screen bg-background text-foreground">
  <div class="max-w-3xl mx-auto px-4 py-12">
    <div class="text-center mb-8">
      <a href="/" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">JTransfer</a>
      <h1 class="text-3xl font-bold mb-2 mt-1">Privacy Policy</h1>
      <p class="text-muted-foreground">Applies to File Share and Image Converter</p>
    </div>

    <Frame.Root>
      <Frame.Panel>
        <div class="prose prose-invert max-w-none space-y-6">
          <p class="text-sm text-muted-foreground">Last updated: February 5, 2026</p>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p class="text-muted-foreground">
              JTransfer ("we", "our", or "us") is a privacy-focused web product suite that currently includes
              File Share and Image Converter. This Privacy Policy explains how we handle information when you use
              our services at jtransfer.jimmyverburgt.com.
            </p>
            <p class="text-muted-foreground">
              We are committed to protecting your privacy. Our service is designed with a zero-knowledge architecture,
              meaning we cannot access the contents of your files.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">2. Data We Collect</h2>

            <h3 class="text-lg font-medium text-foreground">2.1 File Share Data (Encrypted)</h3>
            <p class="text-muted-foreground">
              When you upload files, they are encrypted in your browser before being sent to our servers. We store:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Encrypted file data (we cannot decrypt this)</li>
              <li>Encrypted file names (we cannot decrypt this)</li>
              <li>File size and upload timestamp</li>
              <li>Expiration date you selected</li>
            </ul>
            <p class="text-muted-foreground">
              <strong>Important:</strong> The encryption key is generated in your browser and included in the share link.
              We never receive or store the encryption key, making it technically impossible for us to access your files.
            </p>

            <h3 class="text-lg font-medium text-foreground">2.2 Technical Data</h3>
            <p class="text-muted-foreground">
              To operate the service and prevent abuse, we process:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>IP addresses (for rate limiting, stored temporarily)</li>
              <li>Basic request logs (retained for up to 7 days for security purposes)</li>
            </ul>

            <h3 class="text-lg font-medium text-foreground">2.3 Data We Do NOT Collect</h3>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>We do not require account registration</li>
              <li>We do not collect email addresses</li>
              <li>We do not use tracking cookies or analytics</li>
              <li>We do not sell or share data with third parties</li>
            </ul>

            <h3 class="text-lg font-medium text-foreground">2.4 Image Converter Data (Local-Only)</h3>
            <p class="text-muted-foreground">
              The Image Converter runs entirely in your browser. We do not upload, store, or process your images
              on our servers when you use the converter.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">3. How We Use Your Data</h2>
            <p class="text-muted-foreground">We use the collected data solely to:</p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Provide the file sharing service</li>
              <li>Enforce rate limits to ensure fair usage</li>
              <li>Protect against abuse and maintain service security</li>
              <li>Automatically delete files after expiration</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">4. Data Storage & Security</h2>
            <p class="text-muted-foreground">
              Your encrypted files are stored on Cloudflare R2 infrastructure within the European Union.
              We implement the following security measures:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>End-to-end encryption (AES-256-GCM)</li>
              <li>TLS/HTTPS for all data in transit</li>
              <li>Automatic file deletion after 1 or 3 days (based on your selection)</li>
              <li>No permanent storage of file contents</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">5. Data Retention</h2>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li><strong>Uploaded files:</strong> Automatically deleted after 1 or 3 days (your choice)</li>
              <li><strong>Rate limit data:</strong> Automatically expires after the rate limit window (up to 30 days)</li>
              <li><strong>Server logs:</strong> Retained for up to 7 days, then automatically deleted</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">6. Your Rights (GDPR)</h2>
            <p class="text-muted-foreground">
              Under the General Data Protection Regulation (GDPR), you have the right to:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Access the personal data we hold about you</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Lodge a complaint with a supervisory authority</li>
            </ul>
            <p class="text-muted-foreground">
              Due to our zero-knowledge architecture and the lack of user accounts, we have minimal personal data.
              If you have questions about your data, please contact us.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">7. Third-Party Services</h2>
            <p class="text-muted-foreground">We use the following third-party services:</p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li><strong>Cloudflare:</strong> CDN, DDoS protection, and R2 storage (EU region)</li>
              <li><strong>Ko-fi:</strong> Optional donation processing. If you choose to donate, your payment is processed
                entirely by Ko-fi. We do not receive or store any payment information. Ko-fi's own privacy policy applies to
                those transactions.</li>
            </ul>
            <p class="text-muted-foreground">
              These services may process personal data as part of their normal operations.
              Please refer to their respective privacy policies for more information.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">8. Changes to This Policy</h2>
            <p class="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify users of any material changes
              by updating the "Last updated" date at the top of this page.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">9. Contact</h2>
            <p class="text-muted-foreground">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p class="text-muted-foreground">
              Email: <a href="mailto:privacy@jimmyverburgt.com" class="text-primary hover:underline">privacy@jimmyverburgt.com</a>
            </p>
          </section>
        </div>
      </Frame.Panel>
    </Frame.Root>

    <div class="mt-8 text-center text-sm text-muted-foreground">
      <div class="flex items-center justify-center gap-3">
        <a href="/" class="hover:text-foreground transition-colors">Home</a>
        <span>·</span>
        <a href="/security" class="hover:text-foreground transition-colors">Security</a>
        <span>·</span>
        <a href="/terms" class="hover:text-foreground transition-colors">Terms of Service</a>
      </div>
    </div>
  </div>
</div>
