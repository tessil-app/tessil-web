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
  <table class="w-full table-fixed border-collapse text-[0.8125rem] sm:text-sm">
    <caption class="sr-only">What each plan includes</caption>
    <colgroup>
      <col />
      {#each ids as id (id)}
        <col class="w-[19%] sm:w-[18%]" />
      {/each}
    </colgroup>
    <thead>
      <tr>
        <td></td>
        {#each PLANS as plan (plan.id)}
          <th scope="col" class="px-1 pb-4 text-center text-sm font-semibold text-foreground sm:px-3 sm:text-base">
            {plan.name}
            {#if current === plan.id}
              <span class="block text-xs font-normal text-muted-foreground">Your plan</span>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    {#each COMPARISON as group (group.title)}
      <tbody>
        <tr>
          <th
            scope="colgroup"
            colspan={ids.length + 1}
            class="border-b border-border pt-8 pb-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            {group.title}
          </th>
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
