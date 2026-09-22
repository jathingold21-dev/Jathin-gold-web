import { marked } from 'marked';

export function renderMarkdown(source: string) {
  const safe = source.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return marked.parse(safe, { async: false, gfm: true }) as string;
}
