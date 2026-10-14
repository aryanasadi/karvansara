import type { ReactNode } from "react";

/**
 * Minimal, dependency-free Markdown renderer for blog posts.
 * Supports: ## / ### headings, paragraphs, - and 1. lists, > quotes,
 * **bold**, *italic*, `code`, [links](url) and ![images](url).
 */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(!\[[^\]]*\]\([^)]+\))|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;

    if (token.startsWith("![")) {
      const alt = token.slice(2, token.indexOf("]"));
      const src = token.slice(token.indexOf("(") + 1, token.length - 1);
      // eslint-disable-next-line @next/next/no-img-element
      nodes.push(<img key={key} src={src} alt={alt} loading="lazy" />);
    } else if (token.startsWith("[")) {
      const label = token.slice(1, token.indexOf("]"));
      const href = token.slice(token.indexOf("(") + 1, token.length - 1);
      const external = /^https?:\/\//.test(href);
      nodes.push(
        <a key={key} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {label}
        </a>
      );
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function renderMarkdown(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let listBuffer: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let paraBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (!listType || listBuffer.length === 0) return;
    const items = listBuffer.map((li, i) => <li key={i}>{inline(li, `li-${key}-${i}`)}</li>);
    out.push(listType === "ul" ? <ul key={`l${key++}`}>{items}</ul> : <ol key={`l${key++}`}>{items}</ol>);
    listBuffer = [];
    listType = null;
  };

  const flushPara = () => {
    if (paraBuffer.length === 0) return;
    const text = paraBuffer.join(" ");
    out.push(<p key={`p${key++}`}>{inline(text, `p-${key}`)}</p>);
    paraBuffer = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushList();
      flushPara();
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      flushPara();
      out.push(<h3 key={`h${key++}`}>{inline(line.slice(4), `h3-${key}`)}</h3>);
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      flushPara();
      out.push(<h2 key={`h${key++}`}>{inline(line.slice(3), `h2-${key}`)}</h2>);
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      flushPara();
      out.push(<h2 key={`h${key++}`}>{inline(line.slice(2), `h1-${key}`)}</h2>);
      continue;
    }
    if (line.startsWith("> ")) {
      flushList();
      flushPara();
      out.push(<blockquote key={`q${key++}`}>{inline(line.slice(2), `q-${key}`)}</blockquote>);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      if (listType !== "ul") flushList();
      listType = "ul";
      listBuffer.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      flushPara();
      if (listType !== "ol") flushList();
      listType = "ol";
      listBuffer.push(line.replace(/^\d+[.)]\s+/, ""));
      continue;
    }
    flushList();
    paraBuffer.push(line);
  }
  flushList();
  flushPara();
  return out;
}

/** Plain-text version for meta descriptions. */
export function stripMarkdown(source: string, max = 160): string {
  return source
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
