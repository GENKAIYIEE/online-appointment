import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-fit w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[20px] border border-transparent px-[12px] py-[4px] text-[12px] font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary)] text-white",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-[#FEF2F2] text-[#EF4444]",
        outline: "border-border text-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Custom Portal Variants
        confirmed: "bg-[#F0FDF4] text-[#16a34a]",
        pending: "bg-[#FFFBEB] text-[#D97706]",
        completed: "bg-[#F3F4F6] text-[#6B7280]",
        cancelled: "bg-[#FEF2F2] text-[#EF4444]",
        online: "bg-[#EFF6FF] text-[#3B82F6]",
        "walk-in": "bg-[#FFF7ED] text-[#EA580C]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
