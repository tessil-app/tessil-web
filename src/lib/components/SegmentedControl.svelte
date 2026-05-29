<script lang="ts" generics="T">
  import { cn } from "$lib/utils";

  interface Option {
    value: T;
    label: string;
  }

  interface Props {
    label: string;
    options: Option[];
    value: T;
    onChange: (v: T) => void;
    disabled?: boolean;
    class?: string;
  }

  let {
    label,
    options,
    value,
    onChange,
    disabled = false,
    class: className,
  }: Props = $props();

  function keyFor(v: T): string {
    return v === null ? "_null" : String(v);
  }
</script>

<div class={cn("space-y-2", className)}>
  <span class="block text-sm font-medium text-foreground">{label}</span>
  <div
    role="group"
    aria-label={label}
    class="flex gap-2 flex-wrap"
  >
    {#each options as opt (keyFor(opt.value))}
      {@const isActive = opt.value === value}
      <button
        type="button"
        onclick={() => onChange(opt.value)}
        {disabled}
        aria-pressed={isActive}
        class={cn(
          "hover:cursor-pointer flex-1 py-2 px-3 text-sm rounded-full transition-[background-color,color] duration-200 ease-out focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60",
          isActive
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-accent"
        )}
      >
        {opt.label}
      </button>
    {/each}
  </div>
</div>
