import { getContext, setContext } from "svelte";

const KEY = Symbol("table");

export type ActionsWidth = "none" | "sm" | "md";

export interface TableContext {
  /** Tailwind grid-cols class shared by the header and every row. */
  readonly cols: string;
  readonly actions: ActionsWidth;
  readonly hasHeader: boolean;
  /** Rows have a narrow cell on the left, such as a checkbox. */
  readonly hasLeading: boolean;
}

export const actionsWidthClass: Record<ActionsWidth, string> = {
  none: "",
  sm: "sm:w-24",
  md: "sm:w-36",
};

export function setTableContext(ctx: TableContext) {
  setContext(KEY, ctx);
}

export function getTableContext(): TableContext {
  return getContext<TableContext>(KEY);
}
