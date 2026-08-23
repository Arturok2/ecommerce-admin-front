"use client"

import type React from "react"
import { useCallback } from "react"

import { toast as toastManager } from "./toast"

type ToastOptions = {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
}

function useToast() {
  // useCallback con deps [] asegura que `toast` mantenga la MISMA referencia
  // en cada render. Sin esto, cualquier useCallback/useEffect que dependa de
  // `toast` se re-crea/re-ejecuta en cada render, causando loops infinitos.
  const toast = useCallback(({ title, description, variant }: ToastOptions) => {
    toastManager.add({
      title,
      description,
      type: variant === "destructive" ? "error" : "success",
    })
  }, [])

  return { toast }
}

export { useToast }
