"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group font-inter"
      position="bottom-right"
      icons={{
        success: <CircleCheckIcon className="size-5 text-[var(--color-success)]" />,
        info: <InfoIcon className="size-5 text-[var(--color-info)]" />,
        warning: <TriangleAlertIcon className="size-5 text-[var(--color-warning)]" />,
        error: <OctagonXIcon className="size-5 text-[var(--color-error)]" />,
        loading: <Loader2Icon className="size-5 animate-spin text-[var(--color-text-secondary)]" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[var(--color-text-primary)] group-[.toaster]:border group-[.toaster]:border-[var(--color-border)] group-[.toaster]:shadow-2xl font-inter font-medium text-[14px] px-[18px] py-[14px] rounded-[10px]",
          description: "group-[.toast]:text-[var(--color-text-muted)]",
          actionButton:
            "group-[.toast]:bg-[var(--color-primary)] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[var(--color-bg-main)] group-[.toast]:text-[var(--color-text-secondary)]",
          success: "group-[.toaster]:border-l-[4px] group-[.toaster]:border-l-[var(--color-success)]",
          error: "group-[.toaster]:border-l-[4px] group-[.toaster]:border-l-[var(--color-error)]",
          warning: "group-[.toaster]:border-l-[4px] group-[.toaster]:border-l-[var(--color-warning)]",
          info: "group-[.toaster]:border-l-[4px] group-[.toaster]:border-l-[var(--color-info)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
