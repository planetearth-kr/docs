// 노션을 notion-snapshot/에 저장한다. git diff notion-snapshot/ 이 곧 노션 변경분이다.
// 보고서는 stdout, 진행 로그는 stderr. 실행: pnpm notion-sync (NOTION_TOKEN 필요)
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {fetchTree} from './fetch.mjs';
import {escapeText, renderBlocks} from './render.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SNAPSHOT = join(ROOT, 'notion-snapshot');
const DOCS = join(ROOT, 'src/docs');
const IMAGES = join(ROOT, 'static/img/notion');
const TREE_FILE = '_tree.md';
const IMAGE_REF = /\/img\/notion\/([\w.-]+)/g;

const norm = (id) => id.replace(/-/g, '');
const dashed = (id) => norm(id).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 노션 첨부 URL은 매번 서명이 바뀌므로, 경로 속 첨부 UUID로 이름을 고정한다.
export function imageName(url) {
  const {pathname} = new URL(url);
  const parts = pathname.split('/').map(decodeURIComponent);
  const id = parts.findLast((p) => UUID.test(p))?.toLowerCase() ?? createHash('sha1').update(pathname).digest('hex').slice(0, 16);
  const ext = extname(parts.at(-1)).toLowerCase();
  // 원본 PNG가 너무 커서(전체 400MB+) 받을 때 한 번만 webp로 바꾼다. gif/svg는 그대로.
  return id + (['.gif', '.svg'].includes(ext) ? ext : '.webp');
}

export function snapshotFiles(tree, ignoreIds = []) {
  const ignore = new Set(ignoreIds.map(norm));
  const nodes = new Map();
  const treeLines = [];
  const collect = (node, depth) => {
    if (ignore.has(norm(node.id))) return;
    nodes.set(norm(node.id), node);
    treeLines.push(`${'  '.repeat(depth)}- ${escapeText(node.title)}${node.type === 'database' ? ' (DB)' : ''} — \`${dashed(node.id)}\``);
    node.children.forEach((c) => collect(c, depth + 1));
  };
  collect(tree, 0);

  const files = new Map([[TREE_FILE, `# 노션 페이지 트리\n\n${treeLines.join('\n')}\n`]]);
  const images = new Map();
  const warnings = [];
  for (const node of nodes.values()) {
    const ctx = {
      linkFor: (id) => (nodes.has(norm(id)) ? `notion:${dashed(id)}` : null),
      titleFor: (id) => nodes.get(norm(id))?.title ?? null,
      imageSrc: (b) => {
        const img = b.image;
        if (img.type === 'external') return img.external.url;
        const name = imageName(img.file.url);
        images.set(name, img.file.url);
        return `/img/notion/${name}`;
      },
      warn: (msg) => warnings.push(`${node.title}: ${msg}`),
    };
    const body =
      node.type === 'database'
        ? node.children
            .filter((c) => nodes.has(norm(c.id)))
            .map((c) => `- [${escapeText(c.title)}](notion:${dashed(c.id)})`)
            .join('\n')
        : renderBlocks(node.blocks, ctx).replace(/[ \t]+$/gm, '');
    const props = (node.props ?? []).map(([k, v]) => `- ${escapeText(k)}: ${escapeText(v)}`).join('\n');
    const content = [props, body].filter(Boolean).join('\n\n');
    files.set(`${dashed(node.id)}.md`, `# ${escapeText(node.title)}\n${content ? `\n${content}\n` : ''}`);
  }
  return {files, images, warnings};
}

const readDir = (dir) => (existsSync(dir) ? readdirSync(dir) : []);
const imageRefs = (text) => [...text.matchAll(IMAGE_REF)].map((m) => m[1]);

async function saveImage(name, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`이미지 다운로드 실패 ${res.status}: ${name}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = name.endsWith('.webp') ? await sharp(buf).rotate().resize({width: 1600, withoutEnlargement: true}).webp({quality: 80}).toBuffer() : buf;
  writeFileSync(join(IMAGES, name), out);
}

async function main() {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'notion-sync.json'), 'utf8'));
  console.error('노션 트리 읽는 중...');
  const tree = await fetchTree(manifest.root);
  const {files, images, warnings} = snapshotFiles(tree, manifest.ignore);

  const oldFiles = readDir(SNAPSHOT);
  const firstRun = oldFiles.length === 0;
  // 권한 해제나 장애로 트리가 비어 보일 때 대량 삭제 PR이 나가는 것을 막는다.
  if (files.size < oldFiles.length / 2) throw new Error(`노션 페이지가 ${oldFiles.length}개에서 ${files.size}개로 줄었습니다 (절반 미만). 노션 연결 권한을 확인하세요.`);

  // 새로 등장한 이미지만 받는다. 첫 실행(베이스라인)은 docs에 이미 이미지가 있으므로 받지 않는다.
  const known = new Set(oldFiles.flatMap((f) => imageRefs(readFileSync(join(SNAPSHOT, f), 'utf8'))));
  const fresh = firstRun ? [] : [...images].filter(([name]) => !known.has(name));
  mkdirSync(IMAGES, {recursive: true});
  for (const [name, url] of fresh) {
    if (existsSync(join(IMAGES, name))) continue;
    console.error(`이미지 받는 중: ${name}`);
    await saveImage(name, url);
  }

  const changed = [];
  mkdirSync(SNAPSHOT, {recursive: true});
  for (const [file, content] of files) {
    const path = join(SNAPSHOT, file);
    if (existsSync(path) && readFileSync(path, 'utf8') === content) continue;
    writeFileSync(path, content);
    changed.push(file);
  }
  const removed = oldFiles.filter((f) => !files.has(f));
  for (const f of removed) rmSync(join(SNAPSHOT, f));

  // 에이전트가 docs 폴더로 옮기고 남은 이미지를 지운다.
  const used = new Set(
    readdirSync(DOCS, {recursive: true})
      .filter((f) => f.endsWith('.mdx'))
      .flatMap((f) => imageRefs(readFileSync(join(DOCS, f), 'utf8'))),
  );
  for (const f of readDir(IMAGES)) if (!used.has(f) && !fresh.some(([n]) => n === f)) rmSync(join(IMAGES, f));

  const mapped = new Set(Object.values(manifest.pages).flat().map(dashed));
  const unmapped = [...files.keys()].filter((f) => f !== TREE_FILE && !mapped.has(f.slice(0, -3)));
  const title = (f) => `${files.get(f)?.split('\n')[0].slice(2) ?? f} (\`${f}\`)`;
  const section = (head, items) => (items.length ? [`### ${head} (${items.length})`, ...items.map((i) => `- ${i}`), ''] : []);
  console.log(
    [
      ...section('노션에서 바뀐 페이지', changed.map(title)),
      ...section('노션에서 사라진 페이지', removed.map((f) => `\`${f}\``)),
      ...section('새 이미지 (static/img/notion)', fresh.map(([n]) => `\`${n}\``)),
      ...section('docs 매핑 없는 노션 페이지', unmapped.map(title)),
      ...section('변환 경고', warnings),
    ].join('\n'),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
