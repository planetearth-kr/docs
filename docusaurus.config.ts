import {themes as prismThemes} from 'prism-react-renderer';

const config: Config = {
  title: 'PlanetEarth',
  tagline: '마인크래프트 오픈월드 지구서버',
  url: 'https://planetearth.kr/',
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

  themes: [
    [
      '@docusaurus/theme-classic',
      {
        customCss: require.resolve('./src/css/custom.css'),
      },
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        path: 'src/docs',
        routeBasePath: '/',
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'PlanetEarth',
      logo: {
        alt: 'PlanetEarth Logo',
        src: 'img/logo.png',
      },
      items: [
        {to: 'https://planetearth.kr', label: '홈', position: 'right'},
        {
          type: 'docSidebar',
          sidebarId: 'defaultSidebar',
          position: 'right',
          label: '가이드',
        },
        {to: 'https://planetearth.kr/map', label: '지도', position: 'right'},
        {to: 'https://planetearth.kr/discord', label: '디스코드', position: 'right'},
        /* {
          href: 'https://github.com/planetearth-kr',
          label: 'GitHub',
          position: 'right',
        },*/
      ],
    },
    footer: {
      copyright: `2022 - ${new Date().getFullYear()} planetearth.kr`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
};

export default config;
