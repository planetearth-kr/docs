import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';

const config: Config = {
  title: 'PlanetEarth',
  tagline: '마인크래프트 오픈월드 지구서버',
  url: 'https://docs.planetearth.kr/',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  favicon: 'img/favicon.ico',
  trailingSlash: false,
  organizationName: 'planetearth-kr',
  projectName: 'docs',

  i18n: {
    defaultLocale: 'ko',
    locales: ['ko'],
  },

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.ts'),
          path: 'src/docs',
          routeBasePath: '/',
          // editUrl: 'https://github.com/planetearth-kr/docs/tree/master/',
        },
        blog: false,
        sitemap: {
          lastmod: 'date',
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**', '/search/**'],
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
        {
          href: 'https://planetearth.kr/map',
          label: '웹 지도',
          position: 'left',
        },
        {
          href: 'https://discord.planetearth.kr',
          label: '디스코드',
          position: 'left',
        },
        /* {
          href: 'https://github.com/planetearth-kr',
          label: 'GitHub',
          position: 'right',
        },*/
      ],
    },
    footer: {
      copyright: `Copyright 2022 - ${new Date().getFullYear()} 플래닛네트워크. All rights reserved.`,
    },
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
