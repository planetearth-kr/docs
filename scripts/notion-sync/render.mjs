// ctx = { linkFor(id), titleFor(id), imageSrc(block), warn(msg) }

export const escapeText = (s) => s.replace(/[\\`*_~[\]<>{}|]/g, '\\$&');

// 줄 맨 앞에서 제목/목록으로 읽히는 패턴을 막는다.
const escapeLineStart = (s) => s.replace(/^(#|[-+]|\d+(?=[.)]))(?=[\s.)])/, (m) => (/^\d/.test(m) ? m + '\\' : '\\' + m));

const encodeHref = (href) => href.replace(/[ ()]/g, (c) => encodeURIComponent(c));

function internalLink(href, ctx) {
  const notion = /notion\.(so|site)/.test(href);
  if (!href.startsWith('/') && !notion) return null;
  const path = href.split(/[?#]/)[0];
  const id = path.match(/[0-9a-f]{32}/)?.[0] ?? (notion ? null : path.split('/').pop());
  return id ? ctx.linkFor(id) : null;
}

function codeSpan(s, inTable) {
  const ticks = '`'.repeat(Math.max(0, ...(s.match(/`+/g) || []).map((m) => m.length)) + 1);
  const body = (inTable ? s.replace(/\|/g, '\\|') : s).replace(/\n/g, ' ');
  return ticks === '`' && !/^`|`$/.test(body) ? `\`${body}\`` : `${ticks} ${body} ${ticks}`;
}

const sameStyle = (a, b) => a.href === b.href && JSON.stringify(a.annotations) === JSON.stringify(b.annotations);

export function richText(rt = [], ctx, inTable = false) {
  const segs = [];
  for (const t of rt) {
    const href = t.type === 'mention' && t.mention.type === 'page' ? `/${t.mention.page.id}` : t.href;
    const seg = {text: t.plain_text, href, annotations: {...t.annotations, color: undefined}};
    const last = segs.at(-1);
    if (last && sameStyle(last, seg)) last.text += seg.text;
    else segs.push(seg);
  }
  return segs
    .map(({text, href, annotations: a = {}}) => {
      // 강조 기호 안쪽 끝에 공백이 있으면 마크다운이 깨지므로 밖으로 뺀다.
      const [, lead, core, trail] = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
      if (!core) return text;
      let s = a.code ? codeSpan(core, inTable) : escapeText(core).replace(/\n/g, '<br />');
      if (a.strikethrough) s = `~~${s}~~`;
      if (a.italic) s = `*${s}*`;
      if (a.bold) s = `**${s}**`;
      if (a.underline) s = `<u>${s}</u>`;
      if (href) s = `[${s}](${encodeHref(internalLink(href, ctx) ?? href)})`;
      return lead + s + trail;
    })
    .join('');
}

const indent = (s, n) => s.replace(/^(?=.)/gm, ' '.repeat(n));
const plain = (rt = []) => rt.map((t) => t.plain_text).join('');

// 노션 callout은 거의 다 회색이라 이모지가 먼저 종류를 정한다.
const CAUTION_EMOJI = ['⚠️', '❗', '🚨', '⛔', '🚫', '🚧', '💣'];
function admonitionType(emoji, color = 'default') {
  if (CAUTION_EMOJI.some((e) => emoji?.startsWith(e))) return 'caution';
  if (emoji?.startsWith('💡')) return 'tip';
  if (emoji?.startsWith('ℹ️')) return 'info';
  const c = color.replace('_background', '');
  if (['red', 'orange', 'yellow'].includes(c)) return 'caution';
  if (c === 'green') return 'tip';
  if (['gray', 'default', 'brown'].includes(c)) return 'note';
  return 'info';
}

function linkLine(id, fallbackTitle, ctx) {
  const title = escapeText(ctx.titleFor(id) ?? fallbackTitle ?? '');
  const href = ctx.linkFor(id);
  return href ? `[${title}](${href})` : title || null;
}

function table(b, ctx) {
  const width = b.table.table_width;
  const line = (cells) => `| ${cells.join(' | ')} |`;
  const rows = (b.children || []).map((r) => r.table_row.cells.map((c) => richText(c, ctx, true)));
  const header = b.table.has_column_header ? rows.shift() : Array(width).fill('');
  return [line(header), line(Array(width).fill('---')), ...rows.map(line)].join('\n');
}

const SKIP = new Set(['table_of_contents', 'breadcrumb', 'column', 'template']);

function renderBlock(b, ctx) {
  const data = b[b.type] || {};
  const text = () => richText(data.rich_text, ctx);
  const kids = () => renderBlocks(b.children || [], ctx);
  const withKids = (head) => [head, kids()].filter(Boolean).join('\n\n');

  switch (b.type) {
    case 'paragraph':
      return withKids(escapeLineStart(text())) || null;
    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
    case 'heading_4':
      return withKids(`${'#'.repeat(Number(b.type.at(-1)) + 1)} ${text()}`);
    case 'bulleted_list_item':
      return ['- ' + text(), indent(kids(), 2)].filter(Boolean).join('\n');
    case 'numbered_list_item':
      return ['1. ' + text(), indent(kids(), 3)].filter(Boolean).join('\n');
    case 'to_do':
      return [`- [${data.checked ? 'x' : ' '}] ${text()}`, indent(kids(), 2)].filter(Boolean).join('\n');
    case 'toggle':
      return `<details>\n<summary>${text()}</summary>\n\n${kids()}\n\n</details>`;
    case 'quote':
      return withKids(text()).replace(/^/gm, '> ').replace(/ $/gm, '');
    case 'callout': {
      const emoji = data.icon?.type === 'emoji' ? data.icon.emoji : null;
      const body = withKids([emoji, text()].filter(Boolean).join(' '));
      const inner = Math.max(0, ...(body.match(/^:{3,}/gm) || []).map((m) => m.length));
      const fence = ':'.repeat(Math.max(3, inner + 1));
      return `${fence}${admonitionType(emoji, data.color)}\n${body}\n${fence}`;
    }
    case 'code': {
      const code = plain(data.rich_text);
      const fence = '`'.repeat(Math.max(3, ...(code.match(/`+/g) || []).map((m) => m.length + 1)));
      const lang = data.language === 'plain text' ? '' : data.language;
      return `${fence}${lang}\n${code}\n${fence}`;
    }
    case 'divider':
      return '---';
    case 'image':
      return `![${escapeText(plain(data.caption))}](${encodeHref(ctx.imageSrc(b))})`;
    case 'video':
    case 'embed':
    case 'bookmark':
    case 'link_preview':
    case 'pdf':
    case 'file': {
      const url = data.url ?? data.external?.url ?? data.file?.url;
      if (!url) return null;
      return `[${escapeText(plain(data.caption)) || escapeText(url)}](${encodeHref(url)})`;
    }
    case 'table':
      return table(b, ctx);
    case 'column_list':
      return (b.children || []).map((col) => renderBlocks(col.children || [], ctx)).filter(Boolean).join('\n\n');
    case 'synced_block':
      return kids();
    case 'child_page':
    case 'child_database':
      return linkLine(b.id, data.title, ctx);
    case 'link_to_page':
      return linkLine(data[data.type], null, ctx);
    default:
      if (!SKIP.has(b.type)) ctx.warn(`지원하지 않는 블록: ${b.type}`);
      return null;
  }
}

// 같은 종류의 목록 항목끼리는 줄바꿈 하나로 붙여야 한 목록이 된다.
const listKind = (type) => ({bulleted_list_item: 'ul', to_do: 'ul', numbered_list_item: 'ol'})[type];

export function renderBlocks(blocks, ctx) {
  let out = '';
  let prevKind;
  for (const b of blocks) {
    const s = renderBlock(b, ctx);
    if (!s) continue;
    const kind = listKind(b.type);
    if (out) out += kind && kind === prevKind ? '\n' : '\n\n';
    out += s;
    prevKind = kind;
  }
  return out;
}
