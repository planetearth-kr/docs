# PlanetEarth 가이드

환영합니다! PlanetEarth 가이드 저장소입니다.


## 로컬 실행

Node.js 22+ 와 pnpm 이 필요합니다.

```bash
pnpm install
pnpm start
```

## 빌드 및 검증

```bash
pnpm build
pnpm typecheck 
```

## 기여하기

가이드 내용의 원본은 [노션](https://planetearthmc.notion.site/PlanetEarth-9e3ba37035e44f59bf492a8bede7b646)입니다. 노션을 수정하면 매일 자동 PR(`notion-sync` 브랜치)로 이 저장소에 반영됩니다.

1. GitHub Action이 노션 전체를 `notion-snapshot/`에 마크다운으로 저장합니다.
2. 스냅샷에 바뀐 내용이 있으면 Claude Code가 그 변경분만 `src/docs/`의 해당 문서에 옮깁니다. 이때 [`scripts/notion-sync/style-guide.md`](scripts/notion-sync/style-guide.md)의 문체를 따릅니다.
3. 프리뷰를 확인하고 PR을 머지합니다.

노션 페이지와 docs 파일의 연결은 `notion-sync.json`의 `pages`(`docs 경로 → 노션 페이지 ID`)에 있습니다. docs의 폴더 구조와 문서 구성은 노션과 달라도 됩니다. 노션에 없는 문서(`reference/api.mdx`, `getting-started/map.mdx` 등)는 이 저장소에서 직접 수정합니다.

필요한 secret: `NOTION_TOKEN`, `ANTHROPIC_API_KEY`. 로컬에서 스냅샷만 만들려면 `.env`에 `NOTION_TOKEN`을 넣고 `pnpm notion-sync`를 실행하세요.

For the love of, [Docusaurus 3](https://docusaurus.io/) 