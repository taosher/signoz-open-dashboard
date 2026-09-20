import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  copyable?: boolean;
}

export function CodeBlock({ code, language, className, copyable = true }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/10 bg-black/50",
        className,
      )}
    >
      {language ? (
        <span className="absolute left-4 top-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {language}
        </span>
      ) : null}
      {copyable ? <CopyButton text={code} /> : null}
      <pre className={cn("overflow-x-auto p-4 text-xs leading-6 sm:text-sm", language ? "pt-9" : "")}>
        <code className="font-mono text-zinc-300">{code}</code>
      </pre>
    </div>
  );
}
