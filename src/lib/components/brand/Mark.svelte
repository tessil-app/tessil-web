<script lang="ts">
  // Four hand-cut tiles. Three take the text colour; the one that has
  // lifted out of the grid is the brand blue.

  type Props = {
    size?: number | string;
    class?: string;
    title?: string;
  };

  let { size = 32, class: className = "", title }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 100 100"
  width={size}
  height={size}
  stroke-width="3"
  stroke-linejoin="round"
  class={className}
  role={title ? "img" : "presentation"}
  aria-label={title}
  aria-hidden={title ? undefined : true}
>
  {#if title}<title>{title}</title>{/if}
  <g fill="currentColor" stroke="currentColor">
    <path d="M9 13 44 10 46 45 11 47Z" />
    <path d="M10 55 45 54 44 90 12 88Z" />
    <path d="M54 55 89 57 88 91 55 89Z" />
  </g>
  <path class="lift" d="M59 7 93 3 97 38 62 43Z" />
</svg>

<style>
  .lift {
    fill: var(--primary);
    stroke: var(--primary);
  }
  /* The brand blue is too dim on the dark header. */
  :global(.dark) .lift {
    fill: #6a86ff;
    stroke: #6a86ff;
  }
</style>
