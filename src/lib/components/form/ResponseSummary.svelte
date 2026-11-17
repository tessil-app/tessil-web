<script lang="ts">
  // Every response to a form, counted per question. Picking an option
  // shows the responses that chose it.

  import Badge from "$lib/components/Badge.svelte";
  import { share, type QuestionSummary } from "$lib/form/summary";

  interface Props {
    summaries: QuestionSummary[];
    /** Responses counted. */
    total: number;
    onPick: (question: QuestionSummary, value: string | boolean) => void;
    onOpen: (responseId: string) => void;
  }

  let { summaries, total, onPick, onOpen }: Props = $props();

  function optionLabel(value: string | boolean): string {
    return typeof value === "boolean" ? (value ? "Yes" : "No") : value;
  }
</script>

<ol class="space-y-3">
  {#each summaries as s, i (s.id)}
    <li class="rounded-lg bg-card p-4 sm:p-5 space-y-3">
      <div class="space-y-1">
        <h3 class="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
          <span class="break-words">
            <span class="text-muted-foreground tabular-nums">{i + 1}.</span>
            {s.label}
          </span>
          {#if !s.current}
            <Badge>No longer asked</Badge>
          {/if}
        </h3>
        <p class="text-xs text-muted-foreground">
          {s.answered} of {total} answered{s.type === "file" && s.files > 0
            ? `, ${s.files} ${s.files === 1 ? "file" : "files"}`
            : ""}
        </p>
      </div>

      {#if s.options.length > 0}
        <ul class="space-y-1.5">
          {#each s.options as option (String(option.value))}
            {@const percent = share(option.count, total)}
            <li>
              <button
                type="button"
                onclick={() => onPick(s, option.value)}
                disabled={option.count === 0}
                aria-label="{optionLabel(option.value)}: {option.count} of {total}. Show these responses"
                class="relative block w-full overflow-hidden rounded-md bg-secondary text-left transition-colors duration-150 ease-out enabled:hover:cursor-pointer enabled:hover:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  aria-hidden="true"
                  class="absolute inset-y-0 left-0 bg-primary/15"
                  style:width="{percent}%"
                ></span>
                <span class="relative flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span class="flex min-w-0 items-center gap-2 text-foreground">
                    <span class="truncate">{optionLabel(option.value)}</span>
                    {#if s.current && !option.current}
                      <span class="shrink-0 text-xs text-muted-foreground">removed</span>
                    {/if}
                  </span>
                  <span class="shrink-0 tabular-nums text-muted-foreground">
                    <span class="text-foreground">{option.count}</span> · {percent}%
                  </span>
                </span>
              </button>
            </li>
          {/each}
        </ul>
        {#if s.type === "choices"}
          <p class="text-xs text-muted-foreground">People could pick several, so these add up to more than 100%.</p>
        {/if}
      {:else if s.latest.length > 0}
        <ul class="space-y-1.5">
          {#each s.latest as entry (entry.responseId)}
            <li>
              <button
                type="button"
                onclick={() => onOpen(entry.responseId)}
                class="block w-full rounded-md bg-secondary px-3 py-2 text-left text-sm text-foreground transition-colors duration-150 ease-out hover:cursor-pointer hover:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span class="line-clamp-2 break-words">{entry.text}</span>
              </button>
            </li>
          {/each}
        </ul>
        {#if s.answered > s.latest.length}
          <p class="text-xs text-muted-foreground">The newest {s.latest.length}. Every answer is in the responses and the export.</p>
        {/if}
      {/if}
    </li>
  {/each}
</ol>
