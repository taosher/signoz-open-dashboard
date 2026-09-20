"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      aria-label="Copy to clipboard"
      onClick={copy}
      className={cn(
        "absolute right-3 top-3 rounded-md border border-white/10 bg-white/5 p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
