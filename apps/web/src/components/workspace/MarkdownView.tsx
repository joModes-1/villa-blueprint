'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Renders GitHub-flavored markdown. No rehype-raw: raw HTML in a document is ignored (T10). */
export function MarkdownView({ content }: { content: string }) {
  return (
    <article className="prose-doc break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}
