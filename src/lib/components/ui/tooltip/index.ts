import Content from "./tooltip-content.svelte";
import { Tooltip as TooltipPrimitive } from "bits-ui";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipPortal = TooltipPrimitive.Portal;

export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  Content as TooltipContent,
  Tooltip as Root,
  TooltipTrigger as Trigger,
  Content,
  TooltipProvider as Provider,
  TooltipPortal as Portal,
};
