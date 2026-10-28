const API = 'https://api.notion.com/v1/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, body) {
  const headers = {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };
  for (let attempt = 0; ; attempt++) {
    await sleep(350); // 평균 초당 3회 제한
    const res = await fetch(API + path, body ? {method: 'POST', headers, body: JSON.stringify(body)} : {headers});
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await sleep(Number(res.headers.get('retry-after') || 2) * 1000);
      continue;
    }
    const json = await res.json();
    if (!res.ok) throw new Error(`Notion API ${res.status} ${path}: ${json.message}`);
    return json;
  }
}

async function paginate(path, body) {
  const results = [];
  let cursor;
  do {
    const json = body
      ? await api(path, {...body, start_cursor: cursor})
      : await api(`${path}?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    results.push(...json.results);
    cursor = json.has_more ? json.next_cursor : undefined;
  } while (cursor);
  return results;
}

const clean = (s) => s.replace(/\s+/g, ' ').trim();
const plain = (rt) => clean((rt || []).map((t) => t.plain_text).join(''));
const pageTitle = (page) => plain(Object.values(page.properties || {}).find((p) => p.type === 'title')?.title);

// 생성/수정 시각 같은 자동 속성은 매번 바뀌어 diff 노이즈가 되므로 뺀다.
function propText(p) {
  switch (p.type) {
    case 'rich_text': return plain(p.rich_text);
    case 'select': case 'status': return p[p.type]?.name ?? '';
    case 'multi_select': return p.multi_select.map((o) => o.name).join(', ');
    case 'date': return p.date ? [p.date.start, p.date.end].filter(Boolean).join(' → ') : '';
    case 'number': return p.number == null ? '' : String(p.number);
    case 'checkbox': return p.checkbox ? '✅' : '';
    case 'url': case 'email': case 'phone_number': return p[p.type] ?? '';
    case 'people': return p.people.map((u) => u.name ?? '').join(', ');
    default: return '';
  }
}
const rowProps = (row) =>
  Object.entries(row.properties)
    .map(([name, p]) => [name, p.type === 'title' ? '' : clean(propText(p))])
    .filter(([, v]) => v)
    .sort(([a], [b]) => a.localeCompare(b, 'ko'));

// 하위 페이지/DB는 본문에 넣지 않고 nodes에 따로 모은다.
async function readBlocks(id, nodes) {
  const blocks = await paginate(`blocks/${id}/children`);
  for (const b of blocks) {
    if (b.type === 'child_page') nodes.push(await readPage(b.id, b.child_page.title));
    else if (b.type === 'child_database') nodes.push(await readDatabase(b));
    else if (b.has_children) {
      // 동기화 블록 사본은 원본의 자식을 보여준다.
      const src = b.type === 'synced_block' && b.synced_block.synced_from ? b.synced_block.synced_from.block_id : b.id;
      b.children = await readBlocks(src, nodes);
    }
  }
  return blocks;
}

async function readPage(id, title, props = []) {
  const children = [];
  const blocks = await readBlocks(id, children);
  return {id, type: 'page', title: clean(title), props, blocks, children};
}

async function readDatabase(block) {
  // 노션 API는 뷰 정렬을 알려주지 않는다. 생성 순서도 뒤섞여 있어서 제목 자연 정렬("제 2회" < "제 10회")을 쓴다.
  const rows = (await paginate(`databases/${block.id}/query`, {})).sort((a, b) => pageTitle(a).localeCompare(pageTitle(b), 'ko', {numeric: true}));
  const children = [];
  for (const row of rows) children.push(await readPage(row.id, pageTitle(row), rowProps(row)));
  return {id: block.id, type: 'database', title: clean(block.child_database.title), blocks: [], children};
}

export async function fetchTree(rootId) {
  if (!process.env.NOTION_TOKEN) throw new Error('NOTION_TOKEN 환경변수가 없습니다');
  const root = await api(`pages/${rootId}`);
  return readPage(root.id, pageTitle(root));
}
