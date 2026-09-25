"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg text-slate-500 dark:text-muted-foreground outline-none transition-colors hover:text-slate-700 dark:hover:text-foreground focus-visible:ring-2 focus-visible:ring-slate-300">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-bold text-slate-800 dark:text-foreground pr-6", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-slate-600 dark:text-muted-foreground", className)}
      {...props}
    />
  )
}

// ボタンは子の数に応じて横幅を等分する
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("mt-6 grid grid-flow-col auto-cols-fr gap-2", className)}
      {...props}
    />
  )
}

// destructive は削除など取り消せない操作に使い、赤の塗りにする
function DialogActionButton({
  className,
  variant = "default",
  destructive = false,
  ...props
}: React.ComponentProps<typeof Button> & { destructive?: boolean }) {
  return (
    <Button
      type="button"
      variant={variant}
      className={cn(
        "h-12 w-full rounded-full px-4 text-base font-bold",
        variant === "default" && "hover:bg-primary/90",
        destructive && "bg-red-600 dark:bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-700",
        className
      )}
      {...props}
    />
  )
}

export { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogActionButton }
