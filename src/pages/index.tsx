import React, {useState} from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  const [showPopup, setShowPopup] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText('planetearth.kr');
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 2000);
    } catch (error) {
      console.error('복사에 실패했어요:', error);
    }
  };

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className={clsx('container', styles.containerWithMargins)}>
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <button
            className={clsx('button button--lg', styles.buttonCustomColor)}
            onClick={handleCopy}
          >
            IP: planetearth.kr
          </button>
          {showPopup && <div className={styles.popup}>주소를 복사했어요!</div>}
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`마인크래프트 오픈월드 지구서버`}
      description="마인크래프트 오픈월드 지구서버 PlanetEarth">
      <HomepageHeader />
    </Layout>
  );
}
