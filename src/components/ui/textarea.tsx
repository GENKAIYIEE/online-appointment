import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[80px] w-full rounded-[8px] border-[1.5px] border-[var(--color-border)] bg-white px-[14px] py-[10px] text-[14px] font-normal transition-all duration-200 outline-none placeholder:text-[var(--color-text-muted)] focus-visible:border-[var(--color-border-focus)] focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF] aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
