import {themes as prismThemes} from 'prism-react-renderer';

const config: Config = {
  title: 'PlanetEarth',
  tagline: '마인크래프트 오픈월드 지구서버',
  url: 'https://docs.planetearth.kr/',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  trailingSlash: false,
  organizationName: 'planetearth-kr',
  projectName: 'docs',

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
          // editUrl: 'https://github.com/planetearth-kr/docs/tree/master/',
        },
        sitemap: {
          lastmod: 'date',
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
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
      appId: 'K7LZJ1O8AW',
      apiKey: 'a3cec996f9bf8146ef99af8fedd6b2a2',
      indexName: 'planetearth_docs',
      contextualSearch: true,
      searchParameters: {},
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
};

export default config;
