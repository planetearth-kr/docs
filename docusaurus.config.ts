import {themes as prismThemes} from 'prism-react-renderer';

const config: Config = {
  title: 'PlanetEarth',
  tagline: '마인크래프트 오픈월드 지구서버',
  url: 'https://docs.planetearth.kr/',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'planetearth-kr', // Usually your GitHub org/user name.
  projectName: 'docs', // Usually your repo name.

  i18n: {
    defaultLocale: 'ko',
    locales: ['ko'],
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          path: 'src/docs',
          routeBasePath: '/',
          editUrl: 'https://github.com/planetearth-kr/docs/tree/master/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      // title: 'PlanetEarth',
      logo: {
        alt: 'PlanetEarth',
        src: 'img/logo.png',
      },
      items: [
        {to: 'https://planetearth.kr', label: '홈', position: 'left'},
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: '가이드',
        },
        {to: 'https://planetearth.kr/map', label: '지도', position: 'left'},
        {to: 'https://discord.planetearth.kr', label: '디스코드', position: 'left'},
        /* {
          href: 'https://github.com/planetearth-kr',
          label: 'GitHub',
          position: 'right',
        },*/
      ],
    },
    /*footer: {
      copyright: `2022 - ${new Date().getFullYear()} planetearth.kr`,
    },*/
    algolia: {
      appId: 'JBGJNIAKWU',
      apiKey: 'aa67a7f69b5d33ce71b27d65eb937130',
      indexName: 'planetearth_docs',
      contextualSearch: true,
      externalUrlRegex: 'external\\.com|domain\\.com',
      replaceSearchResultPathname: {
        from: '/docs/',
        to: '/',
      },
      searchParameters: {},
      // Optional: path for search page that enabled by default (`false` to disable it)
      searchPagePath: 'search',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
};

export default config;
