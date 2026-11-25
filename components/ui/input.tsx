import * as React from "react";
import { cn } from "@/lib/utils";

// Orchard field: tinted surface, round radius, plum focus edge. A file input gets a
// rounded tinted picker button instead of the browser default.
const FIELD =
  "flex h-11 w-full rounded-2xl border-2 border-transparent bg-card px-4 text-base transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";
const FILE =
  "text-sm file:mr-3 file:h-11 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:font-bold file:text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-50";

const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(function Input(
  { className, type, ...props },
  ref
) {
  return <input ref={ref} type={type} className={cn(type === "file" ? FILE : FIELD, className)} {...props} />;
});

export { Input };
