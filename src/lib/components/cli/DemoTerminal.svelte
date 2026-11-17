<script lang="ts">
  // A terminal a visitor can type in. It answers a handful of `tessil`
  // commands with the lines the real tool prints. Nothing is sent anywhere:
  // the files, the account and the portal are made up.

  import { cn } from "$lib/utils";
  import { onMount, tick } from "svelte";

  type Tone = "plain" | "dim" | "ok" | "link" | "bad";
  interface Line {
    text: string;
    tone?: Tone;
    /** A command the visitor ran, shown after a prompt. */
    command?: boolean;
  }

  const suggestions = [
    "tessil send report.pdf",
    "tessil login",
    'tessil pull "Tax 2025"',
    "tessil list",
    "tessil help",
  ];

  const HELP: Line[] = [
    { text: "tessil login                      Pair this machine with your account" },
    { text: "tessil whoami                     Show the account and what this key may do" },
    { text: "tessil send <file>...             Encrypt and upload, print a link" },
    { text: "tessil get <link>                 Download and decrypt a link" },
    { text: "tessil list                       What this key sent" },
    { text: "tessil revoke <id>                Delete something this key sent" },
    { text: "tessil portals                    Portals this key was handed" },
    { text: 'tessil pull <portal>              Download what arrived; again later for what is new' },
    { text: "tessil mcp                        Run as an MCP server for an AI assistant" },
  ];

  let lines = $state<Line[]>([]);
  let input = $state("");
  let busy = $state(false);
  let reduced = false;
  let field = $state<HTMLInputElement | null>(null);
  let screen = $state<HTMLDivElement | null>(null);

  // What this session sent, so `list` and `revoke` have something to show.
  let sent = $state<{ id: string; name: string; size: string }[]>([]);
  let paired = $state(false);
  let pulled = false;

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  function random(length: number): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(length)), (b) => ALPHABET[b % 64]).join("");
  }
  function hex(groups: number): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(groups * 2)), (b) => b.toString(16).padStart(2, "0"))
      .join("")
      .replace(/(.{4})/g, "$1 ")
      .trim();
  }
  // A size that stays the same for the same name.
  function sizeOf(name: string): string {
    let n = 0;
    for (const c of name) n = (n * 31 + c.charCodeAt(0)) % 9000;
    return `${(n / 1000 + 0.3).toFixed(1)} MB`;
  }

  function words(command: string): string[] {
    return (command.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((w) => w.replace(/^["']|["']$/g, ""));
  }

  function answer(command: string): Line[] {
    const all = words(command);
    if (all[0] !== "tessil") {
      return all.length === 0 ? [] : [{ text: `Only tessil lives here. Try \`tessil help\`.`, tone: "dim" }];
    }
    const [, verb, ...rest] = all;
    const args = rest.filter((a) => !a.startsWith("--"));
    switch (verb) {
      case undefined:
      case "help":
        return HELP;
      case "login": {
        paired = true;
        const code = `${random(4)}-${random(4)}`.toUpperCase().replace(/[^A-Z2-9-]/g, "K");
        return [
          { text: "To let this program act for your account, approve it in your browser:" },
          { text: "" },
          { text: `  https://tessil.app/dashboard/settings/access?code=${code}`, tone: "link" },
          { text: "" },
          { text: `  Code            ${code}` },
          { text: `  This key        ${hex(8)}` },
          { text: "" },
          { text: "The page shows the same key code. If it differs, do not approve." },
          { text: "Waiting for approval (ten minutes at most)…", tone: "dim" },
          { text: "" },
          { text: 'Paired with you@example.com as "MacBook".', tone: "ok" },
          { text: "Its secrets are in your system keychain." },
        ];
      }
      case "whoami":
        return [
          { text: "you@example.com (pro)" },
          { text: "Access key   MacBook" },
          { text: "Works for    90 more days" },
        ];
      case "send": {
        if (args.length === 0) return [{ text: "Name at least one file: tessil send <file>...", tone: "bad" }];
        const id = random(21);
        const name = args.length === 1 ? args[0] : `${args.length} files`;
        const size = sizeOf(args.join(" "));
        sent = [{ id, name, size }, ...sent];
        return [
          { text: `Sent ${name} (${size}), encrypted on this machine.`, tone: "ok" },
          { text: "The link works for 7 days." },
          { text: "" },
          { text: `https://tessil.app/d/${id}#${random(43)}`, tone: "link" },
        ];
      }
      case "get":
        return args.length === 0
          ? [{ text: "Give the link: tessil get <link>", tone: "bad" }]
          : [{ text: "  ./report.pdf  (2.4 MB)" }];
      case "list":
        return sent.length === 0
          ? [{ text: "This access key has not sent anything that still exists." }]
          : sent.map((s) => ({
              text: [s.id, "1 file  ", s.size.padEnd(9), "0 downloads ", "7d left"].join("  "),
            }));
      case "revoke": {
        const before = sent.length;
        sent = sent.filter((s) => s.id !== args[0]);
        return sent.length < before
          ? [{ text: "Deleted. The link no longer works.", tone: "ok" }]
          : [{ text: "This key did not send that. Run `tessil list` for what it did.", tone: "bad" }];
      }
      case "portals":
        return [{ text: "q7Yc2mVn0sLr4TxA9dKe3  5 deliveries    last 2 hours ago       open    Tax 2025" }];
      case "pull": {
        if (args.length === 0) return [{ text: "Name the portal: tessil pull <portal>", tone: "bad" }];
        const title = args[0];
        const again = pulled;
        pulled = true;
        return again
          ? [{ text: `${title}: 0 deliveries saved to ./${title}, 5 already there.`, tone: "ok" }]
          : [
              { text: `${title}/7F3A-91C2/passport.jpg` },
              { text: `${title}/7F3A-91C2/annual-statement.pdf` },
              { text: `${title}/B6B7-3015/mortgage-overview.pdf` },
              { text: `${title}: 2 deliveries saved to ./${title}, 3 already there.`, tone: "ok" },
            ];
      }
      case "mcp":
        return [
          { text: "An assistant starts this itself, to use the tool as you do.", tone: "dim" },
          { text: "Set it up with: claude mcp add tessil -- tessil mcp", tone: "dim" },
        ];
      case "logout":
        paired = false;
        return [{ text: "Signed out. This access key no longer works." }];
      default:
        return [{ text: `Unknown command "${verb}". Run \`tessil help\`.`, tone: "bad" }];
    }
  }

  const wait = (ms: number) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));

  async function down() {
    await tick();
    if (screen) screen.scrollTop = screen.scrollHeight;
  }

  async function run(command: string) {
    const trimmed = command.trim();
    if (busy) return;
    if (trimmed === "clear") {
      lines = [];
      input = "";
      return;
    }
    busy = true;
    input = "";
    lines.push({ text: trimmed, command: true });
    await down();
    for (const line of answer(trimmed)) {
      // The pause the real tool has while you approve in the browser.
      await wait(line.text.startsWith("Paired with") ? 1400 : 70);
      lines.push(line);
      await down();
    }
    busy = false;
    await tick();
  }

  // Types a command as a person would, then runs it.
  async function typeAndRun(command: string, focus = true) {
    if (busy) return;
    if (!reduced) {
      for (let i = 1; i <= command.length; i++) {
        input = command.slice(0, i);
        await wait(22);
      }
      await wait(260);
    }
    await run(command);
    if (focus) field?.focus({ preventScroll: true });
  }

  onMount(() => {
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // One command to start with, so the screen is not empty.
    void typeAndRun(suggestions[0], false);
  });

  const tones: Record<Tone, string> = {
    plain: "text-white/80",
    dim: "text-white/45",
    ok: "text-emerald-300",
    link: "text-[#9db4ff]",
    bad: "text-amber-300",
  };
</script>

<div class="terminal">
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div
    bind:this={screen}
    class="screen"
    onclick={() => {
      // A click anywhere on the screen puts the cursor in the prompt, unless text was selected.
      if (!window.getSelection()?.toString()) field?.focus({ preventScroll: true });
    }}
  >
    <div role="log" aria-live="polite" aria-label="What the tool printed">
      {#each lines as line, i (i)}
        {#if line.command}
          <p class="whitespace-pre text-white"><span class="select-none pr-[1ch] text-white/40">$</span>{line.text}</p>
        {:else}
          <p class={cn("min-h-[1.5em] whitespace-pre", tones[line.tone ?? "plain"])}>{line.text}</p>
        {/if}
      {/each}
    </div>
    <form
      class="flex items-baseline"
      onsubmit={(e) => {
        e.preventDefault();
        void run(input);
      }}
    >
      <label for="demo-terminal" class="select-none pr-[1ch] text-white/40">$<span class="sr-only"> Type a tessil command</span></label>
      <input
        bind:this={field}
        id="demo-terminal"
        bind:value={input}
        readonly={busy}
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        placeholder={lines.length > 0 && !busy ? "tessil help" : ""}
        class="min-w-0 flex-1 bg-transparent text-white caret-white placeholder:text-white/25 focus:outline-none"
      />
    </form>
  </div>
</div>

<div class="mt-4 flex flex-wrap items-center gap-2">
  <span class="text-sm text-muted-foreground">Type in it, or run</span>
  {#each suggestions.slice(1) as suggestion (suggestion)}
    <button
      type="button"
      disabled={busy}
      onclick={() => typeAndRun(suggestion)}
      class="rounded-full border border-border bg-card px-3 py-1 font-mono text-[0.8125rem] text-foreground transition-colors duration-150 ease-out enabled:hover:cursor-pointer enabled:hover:bg-accent disabled:opacity-60 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {suggestion}
    </button>
  {/each}
</div>
<p class="mt-3 text-sm text-muted-foreground">
  A stand-in that runs in this page: the account, files and portal are made up and nothing is
  sent. The lines are the ones the real tool prints.
</p>

<style>
  /* The one dark thing on the page, as a terminal is. */
  .terminal {
    overflow: hidden;
    border-radius: 1rem;
    background: #07080d;
    box-shadow:
      0 1.5rem 4rem -1.5rem rgba(27, 77, 255, 0.4),
      0 0.5rem 1.5rem -0.75rem rgba(0, 0, 0, 0.3);
  }
  .screen {
    height: 23rem;
    overflow: auto;
    padding: 1.25rem 1.5rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    cursor: text;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }
  @media (max-width: 40rem) {
    .screen {
      height: 19rem;
      padding: 1rem;
      font-size: 0.75rem;
    }
    /* iOS zooms into a field with small type, so it is set at 16px and shrunk to match. */
    .screen :global(input) {
      font-size: 16px;
      width: 133.34%;
      flex: none;
      transform: scale(0.75);
      transform-origin: left center;
    }
  }
</style>
