import { cn } from "@/lib/utils/cn";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label;

  return (
    <label className="flex w-full flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        id={inputId}
        className={cn(
          "min-h-12 rounded-xl border border-border bg-surface px-4 text-base outline-none ring-accent/30 placeholder:text-muted focus:ring-2",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-sm text-danger">{error}</span> : null}
    </label>
  );
}
