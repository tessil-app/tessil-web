<script lang="ts">
  // Every limit of every plan in one table, for whoever wants the detail
  // the plan cards leave out.

  import { COMPARISON, PLANS, type PlanId, type PlanValue } from "$lib/config/plans";
  import { cn } from "$lib/utils";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";

  interface Props {
    /** The signed-in account's plan, to mark its column. */
    current?: string | null;
    class?: string;
  }

  let { current = null, class: className }: Props = $props();

  const ids: PlanId[] = PLANS.map((p) => p.id);

  // Far down the table the column names are out of sight. While they
  // are, a small label follows the pointer and names the column under it.
  let head = $state<HTMLElement | null>(null);
  let headHidden = $state(false);
  let tip = $state<{ x: number; y: number; name: string } | null>(null);

  $effect(() => {
    if (!head || typeof IntersectionObserver === "undefined") return;
    // The site header covers the top of the page.
    const observer = new IntersectionObserver(([entry]) => (headHidden = !entry.isIntersecting), {
      rootMargin: "-72px 0px 0px 0px",
    });
    observer.observe(head);
    return () => observer.disconnect();
  });

  function track(e: PointerEvent) {
    if (e.pointerType !== "mouse") return;
    const cell = (e.target as HTMLElement).closest<HTMLElement>("td[data-plan]");
    tip = cell ? { x: e.clientX, y: e.clientY, name: cell.dataset.plan ?? "" } : null;
  }
</script>

{#snippet cell(value: PlanValue, plan: string)}
  {#if value === true}
    <span aria-hidden="true" class="inline-flex"><IconCheckRegular class="size-4 text-primary" /></span>
    <span class="sr-only">Included in {plan}</span>
  {:else if value === false}
    <span aria-hidden="true" class="text-muted-foreground/60">–</span>
    <span class="sr-only">Not in {plan}</span>
  {:else}
    {value}
  {/if}
{/snippet}

<div class={className}>
  <table
    class="w-full table-fixed border-collapse text-[0.8125rem] sm:text-sm"
    onpointermove={track}
    onpointerleave={() => (tip = null)}
  >
    <caption class="sr-only">What each plan includes</caption>
    <colgroup>
      <col />
      {#each ids as id (id)}
        <col class="w-[19%] sm:w-[18%]" />
      {/each}
    </colgroup>
    <thead bind:this={head}>
      <tr>
        <td></td>
        {#each PLANS as plan (plan.id)}
          <th
            scope="col"
            class={cn(
              "px-1 py-3 text-center text-sm font-semibold text-foreground sm:px-3 sm:text-base",
              plan.id === "pro" && "rounded-t-lg bg-primary/[0.04]",
            )}
          >
            {plan.name}
            {#if current === plan.id}
              <span class="block text-xs font-normal text-muted-foreground">Your plan</span>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    {#each COMPARISON as group, g (group.title)}
      <tbody>
        <!-- The group's name sits in the first column only, so the tint of the
             featured column runs unbroken from its name to the last row. -->
        <tr class="border-b border-border">
          <th
            scope="colgroup"
            class={cn(
              "pb-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground",
              g === 0 ? "pt-2" : "pt-8",
            )}
          >
            {group.title}
          </th>
          {#each PLANS as plan (plan.id)}
            <td class={plan.id === "pro" ? "bg-primary/[0.04]" : ""}></td>
          {/each}
        </tr>
        {#each group.rows as row (row.label)}
          <tr class="border-b border-border">
            <th scope="row" class="py-3 pr-2 text-left font-normal text-foreground break-words sm:pr-4">
              {row.label}
              {#if row.note}
                <span class="block text-xs text-muted-foreground">{row.note}</span>
              {/if}
            </th>
            {#each PLANS as plan (plan.id)}
              <td
                data-plan={plan.name}
                class={cn(
                  "px-1 py-3 text-center align-middle text-foreground sm:px-3",
                  plan.id === "pro" && "bg-primary/[0.04]",
                )}
              >
                {@render cell(row.values[plan.id], plan.name)}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    {/each}
  </table>
</div>

{#if tip && headHidden}
  <div
    aria-hidden="true"
    class="pointer-events-none fixed z-40 -translate-x-1/2 rounded-full bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-sm"
    style:left="{tip.x}px"
    style:top="{tip.y - 40}px"
  >
    {tip.name}
  </div>
{/if}
