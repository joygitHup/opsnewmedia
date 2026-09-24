/**
 * 自研轻量 Markdown → HTML 渲染器（零依赖）。
 *
 * 支持：标题 / 段落 / 粗体 / 斜体 / 删除线 / 行内代码 / 链接 / 图片 /
 *       分割线 / 引用（可多行）/ 有序列表 / 无序列表 / GFM 任务列表 /
 *       围栏代码块 / GFM 表格。
 *
 * 安全策略：所有文本先经 HTML 转义，代码块/行内代码内容同样转义，
 * 链接仅允许 http/https/mailto 协议，杜绝 XSS。
 */

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:', '/'];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return '';
  // 协议相对 URL
  if (url.startsWith('//')) return escapeHtml(url);
  try {
    const u = new URL(url, 'http://placeholder.local');
    if (ALLOWED_PROTOCOLS.includes(u.protocol) || url.startsWith('/')) {
      return escapeHtml(url);
    }
  } catch {
    return '';
  }
  return '';
}

/** 行内语法：代码、图片、链接、粗斜体、删除线 */
function renderInline(text: string): string {
  // 生成的 HTML 片段必须用占位符保护，否则会被后面的 escapeHtml 整体转义
  const rawSegments: string[] = [];
  const stash = (html: string) => {
    rawSegments.push(html);
    return `\u0000RAW${rawSegments.length - 1}\u0000`;
  };

  // 行内代码优先（内容整体转义，不解析内部语法）
  let working = text.replace(/`([^`\n]+)`/g, (_m, code: string) =>
    stash(`<code class="md-inline-code">${escapeHtml(code)}</code>`),
  );

  // 图片 ![alt](url "title")
  working = working.replace(
    /!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)/g,
    (_m, alt: string, url: string, title?: string) => {
      const safe = safeUrl(url);
      if (!safe) return '';
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      return stash(
        `<img src="${safe}" alt="${escapeHtml(alt)}"${titleAttr} class="md-img" loading="lazy" />`,
      );
    },
  );

  // 链接 [text](url)
  working = working.replace(
    /\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)/g,
    (_m, label: string, url: string, title?: string) => {
      const safe = safeUrl(url);
      if (!safe) return escapeHtml(label);
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      return stash(
        `<a href="${safe}"${titleAttr} target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`,
      );
    },
  );

  // 粗体 / 斜体 / 删除线（先转义剩余纯文本，再替换安全标记）
  working = escapeHtml(working)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[\s*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[\s_])_([^_\n]+)_/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 还回受保护的 HTML 片段（代码 / 图片 / 链接）
  working = working.replace(/\u0000RAW(\d+)\u0000/g, (_m, i: string) => rawSegments[Number(i)]);
  return working;
}

interface Block {
  type: 'code' | 'ul' | 'ol' | 'quote' | 'table' | 'html';
  content: string;
  lang?: string;
}

/** 解析 GFM 表格（含表头与对齐行） */
function parseTable(lines: string[], start: number): { html: string; next: number } | null {
  const header = lines[start];
  const divider = lines[start + 1];
  if (!header || !divider || !header.includes('|') || !divider.includes('|')) return null;
  if (!/^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(divider)) return null;

  const splitRow = (row: string): string[] =>
    row
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((c) => c.trim());

  const headers = splitRow(header);
  const aligns = splitRow(divider).map((c) => {
    if (c.startsWith(':') && c.endsWith(':')) return 'center';
    if (c.endsWith(':')) return 'right';
    if (c.startsWith(':')) return 'left';
    return '';
  });

  const bodyRows: string[][] = [];
  let i = start + 2;
  while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
    bodyRows.push(splitRow(lines[i]));
    i += 1;
  }

  const th = headers
    .map((h, idx) => `<th${aligns[idx] ? ` style="text-align:${aligns[idx]}"` : ''}>${renderInline(h)}</th>`)
    .join('');
  const rows = bodyRows
    .map(
      (row) =>
        `<tr>${headers
          .map((_, idx) => {
            const cell = row[idx] ?? '';
            return `<td${aligns[idx] ? ` style="text-align:${aligns[idx]}"` : ''}>${renderInline(cell)}</td>`;
          })
          .join('')}</tr>`,
    )
    .join('');

  return {
    html: `<div class="md-table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`,
    next: i,
  };
}

/**
 * Markdown 转 HTML。
 * @param md Markdown 源文
 * @returns 可直接注入的 HTML 字符串（已做转义与 URL 白名单）
 */
export function markdownToHtml(md: string): string {
  if (!md) return '';
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码块
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || '';
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1; // 跳过结尾 ```
      const label = lang ? `<div class="md-code-lang">${escapeHtml(lang)}</div>` : '';
      blocks.push({
        type: 'code',
        content: `<pre class="md-pre">${label}<code>${escapeHtml(buf.join('\n'))}</code></pre>`,
        lang,
      });
      continue;
    }

    // 空行
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // 分割线
    if (/^\s*([-*_])\s*(?:\1\s*){2,}$/.test(line)) {
      blocks.push({ type: 'html', content: '<hr class="md-hr" />' });
      i += 1;
      continue;
    }

    // 标题
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push({
        type: 'html',
        content: `<h${level} class="md-h md-h${level}">${renderInline(heading[2].trim())}</h${level}>`,
      });
      i += 1;
      continue;
    }

    // 引用块
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({
        type: 'quote',
        content: `<blockquote class="md-quote">${markdownToHtml(buf.join('\n'))}</blockquote>`,
      });
      continue;
    }

    // 列表（有序 / 无序 / 任务）
    if (/^\s*(?:[-*+]\s+|\d+\.\s+)/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: { checked: boolean | null; text: string }[] = [];
      while (i < lines.length && /^\s*(?:[-*+]\s+|\d+\.\s+)/.test(lines[i])) {
        const raw = lines[i].replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/, '');
        const task = raw.match(/^\[([ xX])\]\s+(.*)$/);
        if (task) {
          items.push({ checked: task[1].toLowerCase() === 'x', text: task[2] });
        } else {
          items.push({ checked: null, text: raw });
        }
        i += 1;
      }
      const hasTasks = items.some((it) => it.checked !== null);
      const lis = items
        .map((it) => {
          if (it.checked !== null) {
            return `<li class="md-task"><input type="checkbox" disabled${it.checked ? ' checked' : ''} /> <span${it.checked ? ' class="md-task-done"' : ''}>${renderInline(it.text)}</span></li>`;
          }
          return `<li>${renderInline(it.text)}</li>`;
        })
        .join('');
      blocks.push({
        type: ordered ? 'ol' : 'ul',
        content: `<${ordered ? 'ol' : 'ul'} class="md-list${hasTasks ? ' md-task-list' : ''}">${lis}</${ordered ? 'ol' : 'ul'}>`,
      });
      continue;
    }

    // 表格
    const table = parseTable(lines, i);
    if (table) {
      blocks.push({ type: 'table', content: table.html });
      i = table.next;
      continue;
    }

    // 普通段落：连续非空、非块级起始的行合并，遇软换行保留 <br>
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*(?:[-*+]\s+|\d+\.\s+)/.test(lines[i]) &&
      !/^\s*([-*_])\s*(?:\1\s*){2,}$/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i += 1;
    }
    blocks.push({
      type: 'html',
      content: `<p class="md-p">${renderInline(buf.join('\n')).replace(/\n/g, '<br />')}</p>`,
    });
  }

  return blocks.map((b) => b.content).join('\n');
}

/** 粗略统计 Markdown 字数（剔除标记符号与空白） */
export function countWords(md: string): number {
  const plain = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`\-_[\]()!|]/g, ' ')
    .replace(/\s+/g, '');
  return plain.length;
}
