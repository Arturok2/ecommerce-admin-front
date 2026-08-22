"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface SelectContextValue {
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("Select components must be used inside Select")
  return context
}

function Select({ value, onValueChange, disabled, children }: {
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <SelectContext.Provider value={{ value, onValueChange, disabled, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

function SelectTrigger({ id, className, children }: React.ComponentProps<"button">) {
  const { open, setOpen, disabled } = useSelectContext()
  return (
    <button
      id={id}
      type="button"
      disabled={disabled}
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={cn("flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50", className)}
    >
      {children}
    </button>
  )
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useSelectContext()
  return <span className={cn(!value && "text-muted-foreground")}>{value || placeholder}</span>
}

function SelectContent({ className, children }: React.ComponentProps<"div">) {
  const { open } = useSelectContext()
  if (!open) return null
  return (
    <div className={cn("absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md", className)}>
      {children}
    </div>
  )
}

function SelectItem({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const context = useSelectContext()
  return (
    <button
      type="button"
      className={cn("flex w-full cursor-default items-center rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent", className)}
      onClick={() => {
        context.onValueChange?.(value)
        context.setOpen(false)
      }}
    >
      {children}
    </button>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
