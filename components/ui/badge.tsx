import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Rounded tinted chips. The "sun" variant carries the orchard's recurring
// sun-yellow dot; semantic variants mark state only.
const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground",
      sun: "bg-secondary text-secondary-foreground before:size-2 before:rounded-full before:bg-sun before:content-['']",
      ok: "bg-ok text-background",
      warn: "bg-warn text-background",
      bad: "bg-bad text-background",
    },
  },
  defaultVariants: { variant: "default" },
});

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
