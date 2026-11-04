/**
 * Sanitized Markdown for `signoz/TextPanel`, shared by every theme.
 *
 * The sanitizer allow-list lives here on purpose: it is a security boundary, and keeping one copy
 * means a policy change can never leave one theme rendering sanitized HTML with weaker rules.
 */
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export function renderMarkdown(value: string): string {
  const rendered = marked.parse(value, { async: false, gfm: true, breaks: true });
  const source = typeof rendered === 'string' ? rendered : '';
  return DOMPurify.sanitize(source, {
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^https?:\/\//i,
  });
}
