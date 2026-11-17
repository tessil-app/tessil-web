<script lang="ts">
  // The page that introduces forms. Light where /portals is dark. It shows
  // the product itself: a film of the real editor, and a form that encrypts
  // as you type. The claims are the same ones /security makes.

  import Button from "$lib/components/Button.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import { TYPE_ICON, QUESTION_TYPES_SHOWN } from "$lib/components/form/questionTypes";
  import { generateKey } from "$lib/crypto/key";
  import { encryptFileStream } from "$lib/crypto/streaming";
  import { collectAnswers, encodeAnswers, type AnswerDraft } from "$lib/form/answers";
  import type { Question } from "$lib/form/questions";
  import { share } from "$lib/form/summary";
  import { auth } from "$lib/stores/auth.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import { onMount } from "svelte";

  // ─── the film ─────────────────────────────────────────────────────────────
  // Recorded from /forms/try by scripts/record-forms-film.ts.
  let film = $state<HTMLVideoElement | null>(null);
  let playing = $state(false);

  onMount(() => {
    // Moving pictures only for people who have not asked for less motion.
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) void film?.play().catch(() => {});
  });

  function toggleFilm() {
    if (!film) return;
    if (film.paused) void film.play().catch(() => {});
    else film.pause();
  }

  // ─── the form that encrypts as you type ───────────────────────────────────
  // The same code a real form runs when someone presses send. Nothing
  // leaves the page.
  const demo: Question[] = [
    { id: "demo01", type: "short", label: "What should we call you?" },
    {
      id: "demo02",
      type: "choice",
      label: "What would you use a form for?",
      options: ["Client intake", "Sign-ups", "Feedback", "Something else"],
    },
    { id: "demo03", type: "yesno", label: "Should we be able to read your answers?" },
  ];
  const purposes = demo[1].options ?? [];

  let draft = $state<AnswerDraft>({});
  let sealed = $state<{ hex: string; bytes: number } | null>(null);
  let round = 0;

  $effect(() => {
    const answers = collectAnswers(demo, { ...draft });
    const mine = ++round;
    void (async () => {
      const file = new File([encodeAnswers(answers) as BlobPart], "answers.json");
      const encrypted = encryptFileStream(file, await generateKey());
      const bytes = new Uint8Array(await new Response(encrypted.stream).arrayBuffer());
      // A slower, older run must not overwrite a newer one.
      if (mine !== round) return;
      sealed = {
        hex: Array.from(bytes.slice(0, 208), (b) => b.toString(16).padStart(2, "0")).join(" "),
        bytes: bytes.byteLength,
      };
    })();
  });

  const touched = $derived(Object.values(draft).some((v) => v !== undefined && v !== ""));

  // Example numbers for the summary; the visitor's own choice is added on top.
  const examples = [11, 7, 5, 1];
  const bars = $derived(
    purposes.map((label, i) => ({
      label,
      count: examples[i] + (draft.demo02 === label ? 1 : 0),
      mine: draft.demo02 === label,
    })),
  );
  const total = $derived(bars.reduce((sum, b) => sum + b.count, 0));

  const radio =
    "size-4 shrink-0 accent-primary cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  // What a form's owner can switch on. `max` marks what only that plan has.
  const options: { name: string; about: string; max?: boolean }[] = [
    {
      name: "Files as answers",
      about: "Ask for a copy of an ID or a signed contract between the other questions. It is encrypted like the rest.",
    },
    {
      name: "A welcome and a thank-you",
      about: "A few lines above the questions, and a note after sending that says what happens next.",
    },
    {
      name: "A closing date",
      about: "The page says until when, and the form closes by itself when the day ends.",
    },
    {
      name: "An email when someone answers",
      about: "One per form per hour at most. It can't say what was answered, because we can't read that.",
    },
    {
      name: "Try it first",
      about: "Fill in your own form from the editor, exactly as others will see it. Nothing is sent.",
    },
    {
      name: "English or Dutch",
      about: "Pick the language of the page. Visitors can switch to the other one themselves.",
    },
    {
      name: "Your logo",
      about: "Above the name, so the page looks like yours and not like ours.",
      max: true,
    },
    {
      name: "A password",
      about: "The page shows nothing until it is entered. Change it whenever you like; the link stays.",
      max: true,
    },
  ];
</script>

<Seo
  title="Forms - Tessil"
  description="Ask your questions with one link. Questions and answers are encrypted in the browser, so only you can read what people fill in. No account needed to answer."
  path="/forms"
/>

<div class="bg-background">
  <!-- The product itself, as large as the page allows. -->
  <section class="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-20 sm:pt-16 sm:pb-28">
    <div class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-5">
        <h1 class="text-6xl font-semibold leading-none text-foreground sm:text-7xl lg:text-8xl" style="letter-spacing: -0.045em">
          Forms.
        </h1>
        <p class="max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Ask your questions with one link. The answers reach you, and nobody else.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <Button href="/forms/try" fullWidth={false}>Try the editor</Button>
        {#if auth.user}
          <Button href="/dashboard/forms" variant="secondary" fullWidth={false}>Open your forms</Button>
        {:else}
          <Button href="/pricing" variant="secondary" fullWidth={false}>See the plans</Button>
        {/if}
      </div>
    </div>

    <figure class="mt-10 sm:mt-14">
      <div class="film">
        <video
          bind:this={film}
          poster="/featured/forms-editor.jpg"
          width="1600"
          height="1000"
          muted
          loop
          playsinline
          preload="metadata"
          aria-label="The form editor: two questions are added, then the form is filled in and sent."
          onplay={() => (playing = true)}
          onpause={() => (playing = false)}
        >
          <source src="/featured/forms-editor.mp4" type="video/mp4" />
        </video>
      </div>
      <figcaption class="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <span>The editor, recorded as it is. Add questions, try the form as a visitor, send.</span>
        <TextLink onclick={toggleFilm}>{playing ? "Pause" : "Play"}</TextLink>
      </figcaption>
    </figure>
  </section>

  <!-- Two sides of the same answers. -->
  <section class="border-t border-border">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28">
      <div class="max-w-2xl space-y-4">
        <h2 class="text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          Type something. Watch what we get.
        </h2>
        <p class="text-lg leading-relaxed text-muted-foreground">
          The left side is a form. The right side is what would reach our servers, encrypted
          again with every key you press by the code a real form uses. Nothing leaves this page.
        </p>
      </div>

      <div class="mt-10 grid overflow-hidden rounded-2xl border border-border lg:grid-cols-2">
        <div class="space-y-5 bg-card p-5 sm:p-8">
          <p class="text-sm font-medium text-muted-foreground">In your browser</p>
          <TextInput
            id="demo-name"
            label={demo[0].label}
            maxlength={60}
            autocomplete="off"
            value={(draft.demo01 as string | undefined) ?? ""}
            oninput={(e) => (draft.demo01 = (e.currentTarget as HTMLInputElement).value)}
          />
          <fieldset class="space-y-2">
            <legend class="text-sm font-medium text-foreground">{demo[1].label}</legend>
            {#each purposes as option (option)}
              <label class="flex items-center gap-3 text-sm text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="demo-purpose"
                  checked={draft.demo02 === option}
                  onchange={() => (draft.demo02 = option)}
                  class={radio}
                />
                {option}
              </label>
            {/each}
          </fieldset>
          <fieldset class="space-y-2">
            <legend class="text-sm font-medium text-foreground">{demo[2].label}</legend>
            <div class="flex gap-6">
              {#each [{ value: true, label: "Yes" }, { value: false, label: "No" }] as option (option.label)}
                <label class="flex items-center gap-3 text-sm text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="demo-read"
                    checked={draft.demo03 === option.value}
                    onchange={() => (draft.demo03 = option.value)}
                    class={radio}
                  />
                  {option.label}
                </label>
              {/each}
            </div>
          </fieldset>
        </div>

        <div class="server flex flex-col gap-4 p-5 sm:p-8">
          <p class="flex items-baseline justify-between gap-3 text-sm font-medium">
            <span>On our servers</span>
            <span class="font-normal tabular-nums opacity-70">
              {sealed ? `${sealed.bytes.toLocaleString("en")} bytes` : ""}
            </span>
          </p>
          <p class="bytes" aria-label="Encrypted bytes, unreadable">{sealed?.hex ?? ""}</p>
          <p class="text-sm leading-relaxed opacity-80" aria-live="polite">
            {#if draft.demo03 === true}
              You said we should be able to read it. We still can't.
            {:else if draft.demo03 === false}
              You said we shouldn't be able to read it. We can't.
            {:else if touched}
              Every key changes all of it, and the size stays the same however much you write.
            {:else}
              This is an empty form. It already looks like any other.
            {/if}
          </p>
        </div>
      </div>

      <p class="mt-6 max-w-2xl text-muted-foreground">
        Your questions get the same treatment before they are stored, and so do files people
        add. The key that opens the answers lives in your vault, not with us.
        <TextLink href="/security#forms">Read how it works</TextLink>
        or
        <TextLink href="/verify">check it yourself</TextLink>.
      </p>
    </div>
  </section>

  <section class="border-t border-border">
    <div class="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 py-20 sm:py-28 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
      <div class="space-y-5">
        <h2 class="text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          Ask once.<br />See it add up.
        </h2>
        <p class="max-w-xl text-lg leading-relaxed text-muted-foreground">
          Every response opens on its own, and together they become a summary: how many
          answered each question and what they chose. It is counted in your browser, after
          your vault has opened the answers. Pick an option to see who chose it.
        </p>
        <ul class="space-y-2.5 text-foreground">
          {#each ["Search across every answer", "Export everything to a spreadsheet", "A record of each response, with its reference", "Share a form with one colleague"] as point (point)}
            <li class="flex items-center gap-2.5">
              <IconCheckRegular class="size-4 shrink-0 text-primary" />
              {point}
            </li>
          {/each}
        </ul>
      </div>

      <!-- What the owner sees, fed by the form above. -->
      <div class="space-y-3.5 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p class="text-xs text-muted-foreground">Summary of {total} responses</p>
        <p class="text-xl font-semibold tracking-tight text-foreground">{demo[1].label}</p>
        {#each bars as bar (bar.label)}
          {@const percent = share(bar.count, total)}
          <div class="relative overflow-hidden rounded-md bg-secondary">
            <span class="bar absolute inset-y-0 left-0 bg-primary/15" style:width="{percent}%"></span>
            <span class="relative flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <span class="flex items-center gap-2 text-foreground">
                {bar.label}
                {#if bar.mine}
                  <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">You</span>
                {/if}
              </span>
              <span class="tabular-nums text-muted-foreground">
                <span class="text-foreground">{bar.count}</span>, {percent}%
              </span>
            </span>
          </div>
        {/each}
        <p class="text-xs text-muted-foreground">
          {draft.demo02 ? "Example numbers, with your answer added." : "Example numbers. Pick an answer in the form above and yours is added."}
        </p>
      </div>
    </div>
  </section>

  <section class="border-t border-border">
    <div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <div class="max-w-2xl space-y-5">
        <h2 class="text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          Seven kinds of question.
        </h2>
        <p class="text-lg leading-relaxed text-muted-foreground">
          Mark the ones that must be answered. Reorder, reword and add questions later; the
          link stays the same, and answers already in keep the wording they were given under.
        </p>
      </div>
      <ul class="mt-8 flex flex-wrap gap-2.5">
        {#each QUESTION_TYPES_SHOWN as type (type.value)}
          {@const Icon = TYPE_ICON[type.value]}
          <li class="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            <Icon class="size-4 text-primary" />
            {type.label}
          </li>
        {/each}
      </ul>

      <ul class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {#each options as option (option.name)}
          <li class="space-y-2 bg-card p-6">
            <p class="flex items-center gap-2 font-medium text-foreground">
              {option.name}
              {#if option.max}
                <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Max</span>
              {/if}
            </p>
            <p class="text-sm leading-relaxed text-muted-foreground">{option.about}</p>
          </li>
        {/each}
      </ul>
      <p class="mt-6 text-sm text-muted-foreground">
        People who answer need no account. Responses are deleted after 30 days, or 90 on
        Max, so export what you want to keep.
      </p>
    </div>
  </section>

  <section class="border-t border-border">
    <div class="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center sm:py-32">
      <h2 class="text-4xl font-semibold leading-none tracking-tight text-foreground sm:text-6xl">
        Ask away.
      </h2>
      <p class="max-w-lg text-lg text-muted-foreground">
        Build one now, without an account. Publishing it needs a paid plan: 3 forms of up to
        10 questions on Pro, 10 forms of up to 50 on Max.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <Button href="/forms/try" fullWidth={false}>Try the editor</Button>
        <Button href="/pricing" variant="secondary" fullWidth={false}>See the plans</Button>
      </div>
      <p class="text-sm text-muted-foreground">
        Only need files from people?
        <TextLink href="/portals">Have a look at portals</TextLink>
      </p>
    </div>
  </section>

  <SiteFooter />
</div>

<style>
  /* The film sits in a frame like a window, lit from behind in the brand's blue. */
  .film {
    overflow: hidden;
    border-radius: 1rem;
    border: 1px solid var(--border);
    background: var(--card);
    box-shadow:
      0 1.5rem 4rem -1.5rem rgba(27, 77, 255, 0.35),
      0 0.5rem 1.5rem -0.75rem rgba(0, 0, 0, 0.25);
  }
  .film video {
    display: block;
    width: 100%;
    height: auto;
  }

  /* Our side of the line: dark, and nothing readable on it. */
  .server {
    background: #07080d;
    color: #ffffff;
  }
  .bytes {
    flex: 1;
    min-height: 11rem;
    max-height: 15rem;
    overflow: hidden;
    color: #9db4ff;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.8125rem;
    line-height: 1.7;
    word-spacing: 0.15em;
    overflow-wrap: anywhere;
  }
  .bar {
    transition: width 250ms ease-out;
  }
  @media (prefers-reduced-motion: reduce) {
    .bar {
      transition: none;
    }
  }
</style>
