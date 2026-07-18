import RotatingGlobe from "./components/RotatingGlobe";
import MotionController from "./components/MotionController";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://nomadixapps.org/#organization",
      name: "Nomadix Apps LLC",
      alternateName: "Nomadix",
      url: "https://nomadixapps.org/",
      logo: "https://nomadixapps.org/icon-512.png",
      email: "hello@nomadixapps.org",
      sameAs: ["https://apps.apple.com/us/developer/nomadix-apps-llc/id1798696474"],
    },
    {
      "@type": "WebSite",
      "@id": "https://nomadixapps.org/#website",
      url: "https://nomadixapps.org/",
      name: "Nomadix Apps",
      description: "Independent app studio creating focused iOS and Android software.",
      inLanguage: "en",
      publisher: { "@id": "https://nomadixapps.org/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      name: "ScanKeeper: Loyalty Wallet",
      url: "https://scankeeper.nomadixapps.org/",
      description: "An offline QR and barcode scanner with a simple loyalty card wallet.",
      applicationCategory: "ShoppingApplication",
      operatingSystem: "iOS, iPadOS, Android",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": "https://nomadixapps.org/#organization" },
      downloadUrl: [
        "https://apps.apple.com/app/apple-store/id6742491694",
        "https://play.google.com/store/apps/details?id=com.scankeeperapp.scankeeper",
      ],
    },
    {
      "@type": "SoftwareApplication",
      name: "TrayHabit: Aligner Tracker",
      url: "https://trayhabit.nomadixapps.org/",
      description: "A private clear-aligner wear-time tracker with goals and tray reminders.",
      applicationCategory: "HealthApplication",
      operatingSystem: "iOS",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": "https://nomadixapps.org/#organization" },
      downloadUrl: "https://apps.apple.com/app/apple-store/id6760241722",
    },
  ],
};

const Arrow = ({ diagonal = false }: { diagonal?: boolean }) => (
  <svg
    aria-hidden="true"
    className="arrow-icon"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d={diagonal ? "M5 19 19 5M8 5h11v11" : "M4 12h16M14 6l6 6-6 6"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
    />
  </svg>
);

const StoreBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="store-badge">
    <span className="store-dot" />
    {children}
  </span>
);

export default function Home() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <MotionController />
      <div className="scroll-progress" aria-hidden="true" />

      <header className="site-header page-shell">
        <a className="wordmark" href="#top" aria-label="Nomadix home">
          <span>nomad</span><span className="wordmark-accent">ix</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#projects">Projects</a>
          <a href="#about">About</a>
        </nav>
        <a className="hello-link" href="mailto:hello@nomadixapps.org">
          Say hello <Arrow diagonal />
        </a>
      </header>

      <section className="hero page-shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span>Independent app studio</span><span>Est. anywhere</span></p>
          <h1>Apps made wherever<br />we land.</h1>
          <p className="hero-intro">
            Nomadix is an independent app studio building useful,
            beautifully simple software from wherever we happen to be.
          </p>
          <a className="primary-button" href="#projects">
            Explore our work <Arrow />
          </a>
        </div>

        <div className="hero-visual">
          <RotatingGlobe />
        </div>
      </section>

      <section className="projects section-shell" id="projects">
        <div className="section-heading" data-reveal>
          <p className="section-kicker">Selected work</p>
          <h2>Small apps.<br />Real utility.</h2>
          <p>We make focused products that earn their place on your home screen.</p>
        </div>

        <article className="project-card project-card-main" id="scankeeper" data-reveal data-parallax-card>
          <div className="project-info">
            <div className="project-meta"><span>01 / Live</span><span>iOS + Android</span></div>
            <h3>ScanKeeper</h3>
            <p className="project-tagline">Your loyalty cards,<br />without the loyalty clutter.</p>
            <p className="project-description">
              Scan, organize and open every barcode in seconds. A calm,
              private wallet for the cards you actually use.
            </p>
            <div className="project-links">
              <a href="https://scankeeper.nomadixapps.org/" target="_blank" rel="noreferrer">
                <StoreBadge>Visit website</StoreBadge><Arrow diagonal />
              </a>
              <a href="https://apps.apple.com/app/apple-store/id6742491694?pt=127661831&ct=nomadix&mt=8" target="_blank" rel="noreferrer">
                <StoreBadge>App Store</StoreBadge><Arrow diagonal />
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.scankeeperapp.scankeeper&utm_source=nomadix&utm_medium=website&utm_campaign=portfolio&utm_content=scankeeper" target="_blank" rel="noreferrer">
                <StoreBadge>Google Play</StoreBadge><Arrow diagonal />
              </a>
            </div>
          </div>
          <div className="project-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="phone">
              <div className="phone-top"><span>9:41</span><span>● ● ●</span></div>
              <p>My cards</p>
              <div className="mini-card mini-card-blue"><b>COFFEE</b><span className="barcode" /></div>
              <div className="mini-card mini-card-cream"><b>MARKET</b><span className="barcode" /></div>
              <div className="mini-card mini-card-black"><b>CLUB 09</b><span className="barcode" /></div>
            </div>
            <div className="scan-label">SCAN / KEEP / GO</div>
            <div className="art-coordinates">59.9343° N<br />30.3351° E</div>
          </div>
        </article>

        <article className="project-card project-card-main project-card-trayhabit" id="trayhabit" data-reveal data-parallax-card>
          <div className="trayhabit-art" aria-hidden="true">
            <div className="trayhabit-grid" />
            <div className="trayhabit-orbit trayhabit-orbit-one" />
            <div className="trayhabit-orbit trayhabit-orbit-two" />
            <div className="trayhabit-tooth" />
            <div className="trayhabit-dashboard">
              <div className="trayhabit-dashboard-top"><span>TRAYHABIT</span><span>DAY 16</span></div>
              <div className="trayhabit-progress">
                <div>
                  <strong>20:42</strong>
                  <span>OF 22 HOURS</span>
                </div>
              </div>
              <div className="trayhabit-status">
                <span><b>WEARING</b> On track today</span>
                <i />
              </div>
              <div className="trayhabit-week">
                <span style={{ height: "72%" }} />
                <span style={{ height: "88%" }} />
                <span style={{ height: "64%" }} />
                <span style={{ height: "94%" }} />
                <span style={{ height: "82%" }} />
                <span style={{ height: "98%" }} />
                <span className="today" style={{ height: "91%" }} />
              </div>
              <div className="trayhabit-days"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
            </div>
            <div className="trayhabit-art-label">ALIGN / TRACK / REPEAT</div>
            <div className="trayhabit-coordinate">22:00 DAILY<br />100% PRIVATE</div>
          </div>
          <div className="project-info trayhabit-info">
            <div className="project-meta"><span>02 / Live</span><span>Native iOS</span></div>
            <h3>TrayHabit</h3>
            <p className="project-tagline">Hit your 22-hour goal.<br />Every day.</p>
            <p className="project-description">
              A focused wear-time tracker for clear aligners. One-tap sessions,
              tray-change reminders and private on-device history help keep
              treatment on schedule.
            </p>
            <div className="project-links">
              <a href="https://trayhabit.nomadixapps.org/" target="_blank" rel="noreferrer">
                <StoreBadge>Visit website</StoreBadge><Arrow diagonal />
              </a>
              <a href="https://apps.apple.com/app/apple-store/id6760241722?pt=127661831&ct=nomadix&mt=8" target="_blank" rel="noreferrer">
                <StoreBadge>App Store</StoreBadge><Arrow diagonal />
              </a>
            </div>
          </div>
        </article>

        <article className="project-card project-card-next" data-reveal>
          <div className="next-grid" aria-hidden="true" />
          <div className="project-meta"><span>03 / In the field</span><span>Native iOS</span></div>
          <div className="next-copy">
            <p className="dispatch">Next dispatch</p>
            <h3>Something useful<br />is taking shape.</h3>
            <p>A quiet new tool is being tested somewhere between one timezone and the next.</p>
          </div>
          <span className="soon-stamp">SOON<br /><small>IX—02</small></span>
        </article>
      </section>

      <section className="about section-shell" id="about">
        <div className="about-top" data-reveal>
          <p className="section-kicker">About Nomadix</p>
          <p className="about-lead">
            No big headquarters.<br />No innovation theatre.<br />Just thoughtful software.
          </p>
        </div>
        <div className="about-grid" data-reveal>
          <p className="about-statement">
            We&apos;re a small independent studio working across borders and platforms.
            Moving around keeps us curious. Staying small keeps the work honest.
          </p>
          <div className="principles">
            <div><span>01</span><p><b>Useful by default</b>We solve recognisable problems without inventing new ones.</p></div>
            <div><span>02</span><p><b>Simple on purpose</b>Less interface, less noise, more room for what matters.</p></div>
            <div><span>03</span><p><b>Made to travel</b>Products that feel at home wherever their users are.</p></div>
          </div>
        </div>
      </section>

      <footer className="footer page-shell">
        <div className="footer-callout" data-reveal>
          <p>Have something to say?</p>
          <a href="mailto:hello@nomadixapps.org">Let&apos;s cross paths.<Arrow diagonal /></a>
        </div>
        <div className="footer-bottom">
          <a className="wordmark footer-wordmark" href="#top"><span>nomad</span><span className="wordmark-accent">ix</span></a>
          <p>Nomadix Apps LLC<br />Independent app studio</p>
          <p>Built wherever<br />the signal reaches.</p>
          <p>© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </main>
  );
}
