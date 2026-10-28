import {test} from 'node:test';
import assert from 'node:assert/strict';
import {snapshotFiles, imageName} from './index.mjs';

const ID = (n) => `${String(n).padStart(8, '0')}-0000-0000-0000-000000000000`;
const t = (content) => ({type: 'text', plain_text: content, href: null, annotations: {}});
const node = (n, title, {blocks = [], children = [], type = 'page'} = {}) => ({id: ID(n), type, title, blocks, children});
const tree = node(1, '루트', {
  blocks: [{type: 'child_page', id: ID(2), child_page: {title: '생활'}}, {type: 'link_to_page', link_to_page: {type: 'page_id', page_id: ID(9)}}],
  children: [
    node(2, '생활 {가이드}', {
      blocks: [
        {type: 'paragraph', paragraph: {rich_text: [t('낚시 ')]}},
        {type: 'image', image: {type: 'file', file: {url: `https://s3.example.com/${ID(7)}/${ID(8)}/a.png?sig=1`}, caption: []}},
      ],
    }),
    node(3, '갤러리', {type: 'database', children: [node(4, '1회'), node(5, '2회')]}),
    node(6, '캘린더', {type: 'database'}),
  ],
});

test('one file per page plus tree listing', () => {
  const {files} = snapshotFiles(tree, [ID(6)]);
  assert.deepEqual([...files.keys()].sort(), [...[1, 2, 3, 4, 5].map((n) => `${ID(n)}.md`), '_tree.md']);
  assert.equal(
    files.get('_tree.md'),
    `# 노션 페이지 트리\n\n- 루트 — \`${ID(1)}\`\n  - 생활 \\{가이드\\} — \`${ID(2)}\`\n  - 갤러리 (DB) — \`${ID(3)}\`\n    - 1회 — \`${ID(4)}\`\n    - 2회 — \`${ID(5)}\`\n`,
  );
});

test('links use notion ids and unknown pages stay plain', () => {
  const {files} = snapshotFiles(tree, [ID(6)]);
  assert.equal(files.get(`${ID(1)}.md`), `# 루트\n\n[생활 \\{가이드\\}](notion:${ID(2)})\n`);
});

test('page body trims trailing spaces and records images', () => {
  const {files, images} = snapshotFiles(tree, [ID(6)]);
  assert.equal(files.get(`${ID(2)}.md`), `# 생활 \\{가이드\\}\n\n낚시\n\n![](/img/notion/${ID(8)}.webp)\n`);
  assert.deepEqual([...images.keys()], [`${ID(8)}.webp`]);
});

test('database lists its rows', () => {
  const {files} = snapshotFiles(tree, [ID(6)]);
  assert.equal(files.get(`${ID(3)}.md`), `# 갤러리\n\n- [1회](notion:${ID(4)})\n- [2회](notion:${ID(5)})\n`);
  assert.equal(files.get(`${ID(4)}.md`), '# 1회\n');
});

test('ids match with or without dashes', () => {
  const {files} = snapshotFiles(tree, [ID(6).replace(/-/g, '')]);
  assert.ok(!files.has(`${ID(6)}.md`));
});

test('imageName uses attachment uuid', () => {
  assert.equal(
    imageName('https://prod-files-secure.s3.us-west-2.amazonaws.com/0b1e3c2a-1111-2222-3333-444455556666/7f8e9d0c-aaaa-bbbb-cccc-ddddeeeeffff/Untitled%201.PNG?X-Amz-Signature=abc'),
    '7f8e9d0c-aaaa-bbbb-cccc-ddddeeeeffff.webp',
  );
  assert.equal(imageName('https://ex.com/0b1e3c2a-1111-2222-3333-444455556666/a.GIF'), '0b1e3c2a-1111-2222-3333-444455556666.gif');
  const a = imageName('https://example.com/img/no-uuid?sig=1');
  assert.match(a, /^[0-9a-f]{16}\.webp$/);
  assert.equal(imageName('https://example.com/img/no-uuid?sig=2'), a);
});

test('database row properties come before the body', () => {
  const row = {...node(4, '1회', {blocks: [{type: 'paragraph', paragraph: {rich_text: [t('본문')]}}]}), props: [['주제', '새해 {소원}'], ['진행기간', '2023-01-12 → 2023-01-24']]};
  const {files} = snapshotFiles(node(3, '갤러리', {type: 'database', children: [row]}));
  assert.equal(files.get(`${ID(4)}.md`), '# 1회\n\n- 주제: 새해 \\{소원\\}\n- 진행기간: 2023-01-12 → 2023-01-24\n\n본문\n');
});
