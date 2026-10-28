import {test} from 'node:test';
import assert from 'node:assert/strict';
import {escapeText, richText, renderBlocks} from './render.mjs';

const t = (content, annotations = {}, href = null) => ({type: 'text', plain_text: content, href, annotations});
const block = (type, data = {}, children) => ({type, [type]: data, has_children: !!children, children});
const p = (...rt) => block('paragraph', {rich_text: rt});
const warnings = [];
const ctx = {
  linkFor: (id) => ({aaa: '/start', bbb: '/events/art'})[id] ?? null,
  titleFor: (id) => ({aaa: '뉴비 가이드', bbb: '아트콘 갤러리'})[id] ?? null,
  imageSrc: (b) => `/img/notion/${b.id}.png`,
  warn: (m) => warnings.push(m),
};

test('escapes MDX specials', () => {
  assert.equal(escapeText('a {b} <c> *d* _e_ [f] `g` ~h | \\'), 'a \\{b\\} \\<c\\> \\*d\\* \\_e\\_ \\[f\\] \\`g\\` \\~h \\| \\\\');
  assert.equal(renderBlocks([p(t('# 1위 {상품}'))], ctx), '\\# 1위 \\{상품\\}');
  assert.equal(renderBlocks([p(t('1. 첫째'))], ctx), '1\\. 첫째');
});

test('rich text annotations and links', () => {
  assert.equal(richText([t('굵게', {bold: true}), t(' 보통 '), t('코드{}', {code: true})], ctx), '**굵게** 보통 `코드{}`');
  assert.equal(richText([t(' 공백 ', {bold: true})], ctx), ' **공백** ');
  assert.equal(richText([t('a', {bold: true}), t('b', {bold: true})], ctx), '**ab**');
  assert.equal(richText([t('줄1\n줄2')], ctx), '줄1<br />줄2');
  assert.equal(richText([t('링크', {}, 'https://ex.com/a b')], ctx), '[링크](https://ex.com/a%20b)');
  assert.equal(richText([t('노션', {}, '/aaa')], ctx), '[노션](/start)');
  assert.equal(richText([{type: 'mention', mention: {type: 'page', page: {id: 'bbb'}}, plain_text: '갤러리', annotations: {}}], ctx), '[갤러리](/events/art)');
});

test('callout maps to admonition', () => {
  const callout = (emoji, color, children) => block('callout', {rich_text: [t('내용')], icon: {type: 'emoji', emoji}, color}, children);
  assert.equal(renderBlocks([callout('🌏', 'gray_background')], ctx), ':::note\n🌏 내용\n:::');
  assert.equal(renderBlocks([callout('⚠️', 'blue_background')], ctx), ':::caution\n⚠️ 내용\n:::');
  assert.equal(renderBlocks([callout('ℹ️', 'gray_background')], ctx), ':::info\nℹ️ 내용\n:::');
  assert.equal(renderBlocks([callout('📌', 'blue_background')], ctx), ':::info\n📌 내용\n:::');
  assert.equal(renderBlocks([callout('📌', 'green_background', [p(t('자식'))])], ctx), ':::tip\n📌 내용\n\n자식\n:::');
  assert.equal(renderBlocks([callout('📌', 'red', [callout('💡', 'default')])], ctx), '::::caution\n📌 내용\n\n:::tip\n💡 내용\n:::\n::::');
});

test('nested lists indent', () => {
  const li = (type, text, children) => block(type, {rich_text: [t(text)]}, children);
  const out = renderBlocks([
    li('bulleted_list_item', 'a', [li('numbered_list_item', 'a1')]),
    li('bulleted_list_item', 'b'),
    block('to_do', {rich_text: [t('c')], checked: true}),
    p(t('끝')),
  ], ctx);
  assert.equal(out, '- a\n  1. a1\n- b\n- [x] c\n\n끝');
});

test('toggle becomes details', () => {
  assert.equal(
    renderBlocks([block('toggle', {rich_text: [t('제목')]}, [p(t('본문'))])], ctx),
    '<details>\n<summary>제목</summary>\n\n본문\n\n</details>',
  );
});

test('table cells escape pipes and newlines', () => {
  const row = (...cells) => block('table_row', {cells: cells.map((c) => [t(c)])});
  const table = (header) => block('table', {table_width: 2, has_column_header: header}, [row('a|b', 'c\nd'), row('e', '')]);
  assert.equal(renderBlocks([table(true)], ctx), '| a\\|b | c<br />d |\n| --- | --- |\n| e |  |');
  assert.equal(renderBlocks([table(false)], ctx), '|  |  |\n| --- | --- |\n| a\\|b | c<br />d |\n| e |  |');
});

test('image uses imageSrc', () => {
  const img = {id: 'img1', ...block('image', {type: 'file', file: {url: 'x'}, caption: [t('설명 [1]')]})};
  assert.equal(renderBlocks([img], ctx), '![설명 \\[1\\]](/img/notion/img1.png)');
});

test('headings shift down one level', () => {
  assert.equal(renderBlocks([block('heading_1', {rich_text: [t('큰')]}), block('heading_3', {rich_text: [t('작은')]})], ctx), '## 큰\n\n#### 작은');
});

test('page links and empty paragraphs', () => {
  assert.equal(
    renderBlocks([block('link_to_page', {type: 'page_id', page_id: 'aaa'}), p(), block('child_database', {title: 'x'}), block('divider')].map((b, i) => (i === 2 ? {...b, id: 'bbb'} : b)), ctx),
    '[뉴비 가이드](/start)\n\n[아트콘 갤러리](/events/art)\n\n---',
  );
});

test('unsupported warns and is skipped', () => {
  warnings.length = 0;
  assert.equal(renderBlocks([block('unsupported'), p(t('x')), block('table_of_contents')], ctx), 'x');
  assert.deepEqual(warnings, ['지원하지 않는 블록: unsupported']);
});
