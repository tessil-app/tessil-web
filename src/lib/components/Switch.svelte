<script lang="ts">
  // An on/off setting that takes effect as part of a form. Name it with
  // `label` or point `labelledby` at the text beside it.

  import { cn } from "$lib/utils";

  interface Props {
    checked?: boolean;
    label?: string;
    labelledby?: string;
    describedby?: string;
    disabled?: boolean;
    onChange?: (checked: boolean) => void;
    class?: string;
  }

  let {
    checked = $bindable(false),
    label,
    labelledby,
    describedby,
    disabled = false,
    onChange,
    class: className,
  }: Props = $props();

  function toggle() {
    checked = !checked;
    onChange?.(checked);
  }
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  aria-labelledby={labelledby}
  aria-describedby={describedby}
  {disabled}
  onclick={toggle}
  class={cn(
    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 ease-out hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
    checked ? "bg-primary" : "bg-input",
    className,
  )}
>
  <span
    aria-hidden="true"
    class={cn(
      "inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out",
      checked ? "translate-x-[22px]" : "translate-x-0.5",
    )}
  ></span>
</button>
