<script lang="ts">
  import ProsePage from "$lib/components/ProsePage.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { PORTALS_ANNOUNCED } from "$lib/config/launch";

  const sectionClass = "space-y-3";
  const headingClass = "text-lg font-semibold text-foreground";
  const bodyClass = "text-muted-foreground";
  const stepsClass =
    "list-decimal list-inside text-muted-foreground space-y-1.5 ml-4";
  const resultClass =
    "rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-foreground space-y-2";
  const preClass =
    "overflow-x-auto rounded-md border border-border bg-muted/30 px-4 py-3 text-xs text-foreground";
  const linkClass = "text-primary underline underline-offset-2";
</script>

<Seo
  title="Verify it yourself - Tessil"
  description="Check Tessil's zero-knowledge claim yourself in about two minutes, using the developer tools already in your browser. No code reading required."
  path="/verify"
/>

<ProsePage
  title="Verify it yourself"
  tagline="Every encrypted transfer service claims it cannot read your files. Here is how to check ours, in about two minutes, with tools already in your browser."
  current="verify"
>
        <section class={sectionClass}>
          <p class={bodyClass}>
            You should not have to trust us, and these checks do not ask you to.
            None of them rely on something we assert. Each one relies on
            something your own browser reports, and you can run them against the
            live site right now.
          </p>
          <p class={bodyClass}>
            You will need a transfer you sent to yourself, and your browser's
            developer tools: <code>F12</code> on Windows and Linux,
            <code>Cmd + Option + I</code> on a Mac.
          </p>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>1. The key never reaches our servers</h2>
          <p class={bodyClass}>
            Send yourself a file from the homepage. The link you get back looks
            like this:
          </p>
          <pre class={preClass}><code
              >https://tessil.app/d/7f3a9c2b#kA9tR2xQ...</code
            ></pre>
          <p class={bodyClass}>
            Everything after the <code>#</code> is the decryption key. Your browser
            generated it, and it is the only thing that turns our stored ciphertext
            back into your file.
          </p>
          <ol class={stepsClass}>
            <li>Copy the part of the link after the <code>#</code>.</li>
            <li>Open the link, then open developer tools and select Network.</li>
            <li>Reload the page and let it finish loading.</li>
            <li>Search the recorded requests for the key you copied.</li>
          </ol>
          <div class={resultClass}>
            <p><strong>What you should see:</strong> no matches. Not in a URL, not in a header, not in a request body.</p>
            <p class="text-muted-foreground">
              Browsers do not send the fragment (the part after <code>#</code>)
              to servers. That is the HTTP standard, enforced by the browser you
              are already running, not a policy we promise to honour. There is
              no request we could quietly inspect to learn that key, because it
              is never transmitted.
            </p>
          </div>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>2. What we store is unreadable</h2>
          <ol class={stepsClass}>
            <li>With the Network tab still open, download the file.</li>
            <li>
              Find the request to an address ending in
              <code>r2.cloudflarestorage.com</code>. That is the stored object,
              byte for byte as it sits on our storage.
            </li>
            <li>Open its response.</li>
          </ol>
          <div class={resultClass}>
            <p><strong>What you should see:</strong> binary noise, beginning with the four characters <code>TSL1</code>.</p>
            <p class="text-muted-foreground">
              That is our container format marker. Not your file, not your
              filename, not a thumbnail. The readable file only comes into
              existence after your browser applies the key from step 1. If
              somebody walked off with our entire storage bucket, this is what
              they would have.
            </p>
          </div>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>3. Nothing else is running on the page</h2>
          <ol class={stepsClass}>
            <li>
              Still in the Network tab, look at every domain the page contacted.
            </li>
          </ol>
          <div class={resultClass}>
            <p><strong>What you should see:</strong> <code>tessil.app</code>, <code>api.tessil.app</code>, and a storage URL. That is the entire list.</p>
            <p class="text-muted-foreground">
              No analytics, no tag manager, no fonts pulled from someone else's
              CDN, no session recorder. On a page whose URL contains a
              decryption key, a third-party script is not a privacy nuisance, it
              is a key leak.
            </p>
          </div>
          <p class={bodyClass}>
            This is enforced rather than promised. Two Content-Security-Policy
            layers apply to every page and both have to pass. The first is a
            response header you can read yourself:
          </p>
          <pre class={preClass}><code
              >curl -sI https://tessil.app | grep -i content-security-policy</code
            ></pre>
          <p class={bodyClass}>
            <code>connect-src</code> there limits network requests to our own
            origin and the storage host, so a script could not phone home even
            if one were added by mistake. The second layer is in the page
            itself: view source and you will find a
            <code>content-security-policy</code> meta tag whose
            <code>script-src</code> pins the exact SHA-256 hash of the only inline
            script we ship. Any other inline script, injected by anyone, fails the
            hash and never executes.
          </p>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>4. Read the code</h2>
          <p class={bodyClass}>
            Optional, and the slowest of the four, but it is the only check that
            shows you intent rather than behaviour. Tessil is AGPL-3.0 and the
            entire client is public. The files that matter:
          </p>
          <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li>
              <code>src/lib/crypto/streaming.ts</code> is the encryption itself
            </li>
            <li>
              <code>src/lib/crypto/key.ts</code> generates the key that goes into
              the link fragment
            </li>
            <li>
              <code>src/lib/download/streamDownload.ts</code> decrypts on the way
              back
            </li>
          </ul>
          <p class={bodyClass}>
            <a
              href="https://github.com/tessil-app/tessil-web"
              rel="noopener noreferrer"
              class={linkClass}>github.com/tessil-app/tessil-web</a
            >
            and
            <a
              href="https://github.com/tessil-app/tessil-api"
              rel="noopener noreferrer"
              class={linkClass}>tessil-api</a
            >. AGPL-3.0 means anyone running a modified Tessil as a service has
            to publish their modifications, so a hosted fork cannot quietly
            remove the encryption.
          </p>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>What we can see</h2>
          <p class={bodyClass}>
            The checks above are worth little without this part. We do not need
            to be trusted about your file contents, because the maths handles
            that. We do need to be trusted about the following list, so here it
            is in full:
          </p>
          <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li>The size of each file and when it was uploaded</li>
            <li>How many times a transfer has been downloaded</li>
            <li>When a transfer expires, and when it was deleted</li>
            <li>Your email address, if you chose to create an account</li>
            {#if PORTALS_ANNOUNCED}
              <li>
                For a portal: that it exists and who owns it, when deliveries arrive and how
                large they are, the email address of someone you invite, and when you last
                opened it
              </li>
            {/if}
            <li>
              For sign-in events, the country and network operator derived from
              your IP address at that moment. We do not store IP addresses.
            </li>
          </ul>
          <p class={bodyClass}>
            File contents, filenames, and transfer titles are not on that list,
            and cannot be, because they arrive encrypted.{#if PORTALS_ANNOUNCED}
              {" "}The same goes for a portal's name, what it asks for, and the notes
              senders add.{/if} The full detail lives
            in the <a href="/security" class={linkClass}>security overview</a>
            and the <a href="/privacy" class={linkClass}>privacy policy</a>.
          </p>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>Found something that does not match?</h2>
          <p class={bodyClass}>
            If any check on this page comes out differently than described, that
            is either a bug or a broken promise, and we want to hear about it
            either way. Mail
            <a href="mailto:security@tessil.app" class={linkClass}
              >security@tessil.app</a
            >. Acknowledgement within 72 hours.
          </p>
        </section>
</ProsePage>
