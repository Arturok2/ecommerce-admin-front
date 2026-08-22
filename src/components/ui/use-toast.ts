"use client"

import type React from "react"

import { toast as toastManager } from "./toast"

type ToastOptions = {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
}

function useToast() {
  return {
    toast: ({ title, description, variant }: ToastOptions) =>
      toastManager.add({
        title,
        description,
        type: variant === "destructive" ? "error" : "success",
      }),
  }
}

export { useToast }
