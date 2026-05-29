<script lang="ts">
  import { cn } from "$lib/utils";

  type Step = { action: string; transparency: string };

  const steps: Step[] = [
    {
      action: "You drop a file.",
      transparency: "We never know what it's called.",
    },
    {
      action: "Your browser encrypts it.",
      transparency: "We never have the key.",
    },
    {
      action: "We store ciphertext.",
      transparency: "We can't read it. Not for police, not for ourselves.",
    },
    {
      action: "The recipient decrypts in their browser.",
      transparency: "The key never reaches our server.",
    },
  ];

  type Props = {
    class?: string;
  };

  let { class: className = "" }: Props = $props();
</script>

<section
  class={cn(
    "mt-12 pt-10 border-t border-border/60 space-y-6",
    className,
  )}
  aria-labelledby="how-it-works-title"
>
  <h2 id="how-it-works-title" class="text-base font-semibold text-foreground">
    How it works
  </h2>

  <ol class="space-y-5">
    {#each steps as step, i (i)}
      <li class="flex gap-4">
        <span
          class="flex-shrink-0 inline-flex items-center justify-center size-7 rounded-full bg-primary/10 text-primary text-sm font-semibold tabular-nums"
          aria-hidden="true"
        >
          {i + 1}
        </span>
        <div class="space-y-1">
          <p class="text-sm font-medium text-foreground">{step.action}</p>
          <p class="text-sm text-muted-foreground">{step.transparency}</p>
        </div>
      </li>
    {/each}
  </ol>
</section>
