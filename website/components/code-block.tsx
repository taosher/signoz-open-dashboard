import { createHighlighter } from "shiki";

import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";

const theme = "vesper";
const languages = ["html", "bash", "text", "json"] as const;

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>;

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  highlighterPromise ??= createHighlighter({ themes: [theme], langs: [...languages] });
  return highlighterPromise;
}

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  copyable?: boolean;
}

export async function CodeBlock({
  code,
  language = "text",
  className,
  copyable = true,
}: CodeBlockProps) {
  const lang = (languages as readonly string[]).includes(language) ? language : "text";
  const highlighter = await getHighlighter();
  const html = highlighter.codeToHtml(code, { lang, theme });

  return (
    <div
      className={cn(
        "code-block relative overflow-hidden rounded-xl border border-white/10 bg-black/50",
        className,
      )}
    >
      {language ? (
        <span className="absolute left-4 top-3 z-10 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {language}
        </span>
      ) : null}
      {copyable ? <CopyButton text={code} className="z-10" /> : null}
      <div
        className={cn("p-4 text-xs leading-6 sm:text-sm", language ? "pt-9" : "")}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
