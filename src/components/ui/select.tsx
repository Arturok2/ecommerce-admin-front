"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

interface SelectContextValue {
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
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
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  return (
    <SelectContext.Provider value={{ value, onValueChange, disabled, open, setOpen, triggerRef }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

function SelectTrigger({ id, className, children }: React.ComponentProps<"button">) {
  const { open, setOpen, disabled, triggerRef } = useSelectContext()
  return (
    <button
      ref={triggerRef}
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

function SelectValue({ placeholder, children }: { placeholder?: string; children?: React.ReactNode }) {
  const { value } = useSelectContext()
  // Si el padre pasa `children` (ej. el nombre resuelto a partir del id),
  // eso tiene prioridad sobre el `value` crudo — así los <Select> cuyo
  // value es un id (categoría, cliente, etc.) pueden mostrar una etiqueta
  // legible en vez del id mismo.
  const display = children ?? value
  return <span className={cn(!display && "text-muted-foreground")}>{display || placeholder}</span>
}

interface SelectContentPosition {
  top: number
  left: number
  width: number
  openUpward: boolean
}

// Posición inicial para el primer render del popover, antes de que el
// layout effect calcule el rect real del trigger.
const INITIAL_POSITION: SelectContentPosition = { top: 0, left: 0, width: 0, openUpward: false }

function SelectContent({ className, children }: React.ComponentProps<"div">) {
  const { open, setOpen, triggerRef } = useSelectContext()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState<SelectContentPosition>(INITIAL_POSITION)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  // Recalcula la posición contra el viewport (no contra el contenedor con
  // scroll) para que el listado nunca quede recortado por un ancestro con
  // overflow-hidden/overflow-y-auto, sin importar en qué parte del layout
  // esté montado este Select (ej. dentro de un Dialog con scroll interno).
  React.useLayoutEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      // Si no cabe debajo pero sí arriba, abre hacia arriba.
      const openUpward = spaceBelow < 240 && spaceAbove > spaceBelow

      setPosition({
        top: openUpward ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        openUpward,
      })
    }

    updatePosition()
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("resize", updatePosition)
    return () => {
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("resize", updatePosition)
    }
  }, [open, triggerRef])

  // Cierra al hacer clic fuera del trigger y del contenido flotante.
  React.useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (contentRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, setOpen, triggerRef])

  if (!open || !mounted) return null

  return createPortal(
    <div
      ref={contentRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width,
        transform: position.openUpward ? "translateY(-100%)" : undefined,
      }}
      className={cn(
        "z-[100] max-h-60 overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        className
      )}
    >
      {children}
    </div>,
    document.body
  )
}

function SelectItem({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const context = useSelectContext()
  const isSelected = context.value === value
  return (
    <button
      type="button"
      data-selected={isSelected || undefined}
      className={cn(
        "flex w-full cursor-default items-center rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent data-[selected]:bg-accent/70",
        className
      )}
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
