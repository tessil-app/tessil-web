<script lang="ts">
  type Props = {
    size?: number | string;
    class?: string;
    title?: string;
  };

  let { size = 32, class: className = "", title }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 32 32"
  width={size}
  height={size}
  fill="currentColor"
  class={className}
  role={title ? "img" : "presentation"}
  aria-label={title}
  aria-hidden={title ? undefined : true}
>
  {#if title}<title>{title}</title>{/if}
  <rect x="5" y="5" width="10" height="10" />
  <rect x="19" y="3" width="10" height="10" />
  <rect x="5" y="17" width="10" height="10" />
  <rect x="17" y="17" width="10" height="10" />
</svg>
