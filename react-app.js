import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

const customStyles = {
  root: {
    '--device-w': '402px',
    '--device-h': '874px',
    '--device-radius': '55px',
    '--safe-top': '54px',
    '--safe-bottom': '34px',
    '--padding-x': '20px',
    '--bg-base': '#000000',
    '--bg-surface': '#141415',
    '--bg-surface-raised': '#1C1C1E',
    '--bg-surface-floating': 'rgba(28, 28, 30, 0.75)',
    '--text-primary': '#FFFFFF',
    '--text-secondary': 'rgba(255, 255, 255, 0.6)',
    '--text-tertiary': 'rgba(255, 255, 255, 0.4)',
    '--accent-pink-start': '#FF008A',
    '--accent-pink-end': '#D600FF',
    '--accent-blue-start': '#00E5FF',
    '--accent-blue-end': '#007AFF',
    '--accent-green-start': '#34C759',
    '--accent-green-end': '#30D158',
    '--accent-red-start': '#FF453A',
    '--accent-red-end': '#FF3B30',
    '--accent-yellow-start': '#FFD60A',
    '--accent-yellow-end': '#FF9F0A',
    '--radius-pill': '999px',
    '--radius-card': '28px',
    '--radius-sm': '12px',
    '--radius-inner': '8px',
  },
  device: {
    width: '402px',
    height: '874px',
    borderRadius: '55px',
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
    boxShadow: '0 0 0 12px #1A1A1A, 0 20px 40px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    margin: '0 auto',
  },
  dynamicIsland: {
    position: 'absolute',
    top: '11px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '120px',
    height: '32px',
    background: '#000',
    borderRadius: '20px',
    zIndex: 100,
  },
  screenContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '54px 20px 120px 20px',
    position: 'relative',
    zIndex: 10,
    height: '100%',
    overflowY: 'hidden',
  },
  screenContentScrollable: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    paddingTop: '54px',
    paddingBottom: '100px',
    paddingLeft: '20px',
    paddingRight: '20px',
    position: 'relative',
    zIndex: 10,
    height: '100%',
    overflowY: 'auto',
  },
  bottomNav: {
    position: 'absolute',
    bottom: '34px',
    left: '20px',
    right: '20px',
    height: '68px',
    background: 'rgba(28, 28, 30, 0.75)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: '999px',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '0 8px',
    border: '1px solid rgba(255,255,255,0.05)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    zIndex: 50,
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    color: 'rgba(255,255,255,0.4)',
    width: '60px',
    cursor: 'pointer',
  },
  navItemActive: {
    color: '#FFFFFF',
  },
  navLabel: {
    fontSize: '10px',
    fontWeight: 600,
  },
  card: {
    background: '#141415',
    borderRadius: '28px',
    padding: '24px',
    border: '1px solid rgba(255,255,255,0.03)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  cardElevated: {
    background: 'linear-gradient(180deg, #1C1C1E, #141415)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  pillDark: {
    background: '#1A1A1C',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '999px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#FFFFFF',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
  },
  pillAccent: {
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '999px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 600,
  },
  btn: {
    border: 'none',
    borderRadius: '999px',
    padding: '16px 24px',
    fontSize: '17px',
    fontWeight: 700,
    color: '#FFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
  },
  btnPink: {
    background: 'linear-gradient(135deg, #FF008A, #D600FF)',
    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3), 0 8px 20px rgba(255,0,138,0.3)',
  },
  btnBlue: {
    background: 'linear-gradient(135deg, #00E5FF, #007AFF)',
    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3), 0 8px 20px rgba(0,122,255,0.3)',
  },
  btnGreen: {
    background: 'linear-gradient(135deg, #34C759, #30D158)',
    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3), 0 8px 20px rgba(52,199,89,0.3)',
  },
  btnGhost: {
    background: '#1C1C1E',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
    color: '#FFFFFF',
  },
  avatar: {
    borderRadius: '50%',
    background: '#333',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
  },
  tile: {
    borderRadius: '20px',
    padding: '20px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: '16px',
    color: '#FFF',
    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.2), 0 4px 12px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    minHeight: '100px',
    position: 'relative',
    overflow: 'hidden',
  },
  tileRed: { background: 'linear-gradient(135deg, #FF453A, #FF3B30)' },
  tileBlue: { background: 'linear-gradient(135deg, #00E5FF, #007AFF)' },
  tileYellow: { background: 'linear-gradient(135deg, #FFD60A, #FF9F0A)', color: '#000', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.5), 0 4px 12px rgba(0,0,0,0.2)' },
  tileGreen: { background: 'linear-gradient(135deg, #34C759, #30D158)' },
  tilePink: { background: 'linear-gradient(135deg, #FF008A, #D600FF)' },
};

const globalCSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  body { background-color: #0A0A0A; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif; min-height: 100vh; }
  h1 { font-family: ui-rounded, "SF Pro Rounded", -apple-system, sans-serif; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
  h2 { font-family: ui-rounded, "SF Pro Rounded", -apple-system, sans-serif; font-size: 22px; font-weight: 600; }
  .tile-overlay::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 40%; background: linear-gradient(to bottom, rgba(255,255,255,0.15), transparent); }
  .btn-overlay::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(to bottom, rgba(255,255,255,0.15), transparent); border-radius: 999px 999px 0 0; }
  .icon-glow-pink { filter: drop-shadow(0 0 8px #FF008A); color: #FF008A; }
  .icon-glow-blue { filter: drop-shadow(0 0 8px #00E5FF); color: #00E5FF; }
  .icon-glow-yellow { filter: drop-shadow(0 0 8px #FFD60A); color: #FFD60A; }
  .icon-glow-green { filter: drop-shadow(0 0 8px #34C759); color: #34C759; }
  .avatar-ring { position: relative; }
  .avatar-ring::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; background: linear-gradient(135deg, #34C759, #007AFF, #FF008A); z-index: -1; -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; padding: 3px; }
  .rxarena-app { background-color: #0A0A0A; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
`;

const DynamicIsland = () => (
  <div style={customStyles.dynamicIsland}></div>
);

const NavIcon = ({ tab, activeTab, onNav }) => {
  const icons = {
    Focus: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />,
    Compete: <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V18h14v-1.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05.02.01.03.03.04.04 1.14.83 1.93 1.94 1.93 3.41V18h6v-1.5c0-2.33-4.67-3.5-7-3.5z" />,
    Blitz: <path d="M11.5 2L5 13h5.5l-1 9L19 11h-5.5z" />,
    Profile: <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />,
  };
  const glowClasses = { Focus: 'icon-glow-pink', Compete: 'icon-glow-blue', Blitz: 'icon-glow-yellow', Profile: 'icon-glow-green' };
  const isActive = activeTab === tab;
  return (
    <div
      style={{ ...customStyles.navItem, ...(isActive ? customStyles.navItemActive : {}) }}
      onClick={() => onNav(tab)}
    >
      <svg
        className={isActive ? glowClasses[tab] : ''}
        style={{ width: '24px', height: '24px', fill: 'currentColor', transition: 'all 0.2s ease' }}
        viewBox="0 0 24 24"
      >
        {icons[tab]}
      </svg>
      <span style={customStyles.navLabel}>{tab}</span>
    </div>
  );
};

const BottomNav = ({ activeTab, onNav }) => (
  <div style={customStyles.bottomNav}>
    {['Focus', 'Compete', 'Blitz', 'Profile'].map(tab => (
      <NavIcon key={tab} tab={tab} activeTab={activeTab} onNav={onNav} />
    ))}
  </div>
);

const FocusFront = ({ onFlip }) => (
  <div style={customStyles.screenContent}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', marginBottom: '24px' }}>
      <h1>Focus Mode</h1>
      <div style={customStyles.pillDark}>Case 14/50</div>
    </div>
    <div style={{ ...customStyles.card, ...customStyles.cardElevated, flex: 1, marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={customStyles.pillDark}>M, 34 yrs</span>
        <span style={customStyles.pillDark}>#A-112</span>
      </div>
      <p style={{ fontSize: '18px', lineHeight: 1.5, color: 'rgba(255,255,255,0.6)', marginTop: '12px' }}>
        Patient presents to the ER with sudden onset, crushing substernal chest pain radiating to the left arm. Diaphoretic and short of breath. ECG reveals ST-segment elevation in leads V1-V4.
      </p>
      <div style={{ marginTop: 'auto' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Associated ICD Codes</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ ...customStyles.pillDark, color: '#00E5FF' }}>I21.0</span>
          <span style={{ ...customStyles.pillDark, color: '#00E5FF' }}>Z82.49</span>
        </div>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button className="btn-overlay" style={{ ...customStyles.btn, ...customStyles.btnGhost, flex: 1 }}>Skip</button>
      <button className="btn-overlay" style={{ ...customStyles.btn, ...customStyles.btnPink, flex: 2 }} onClick={onFlip}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 2v6h-6M3 12a9 9 0 1 0 2.63-6.37L2 9" /></svg>
        Flip Card
      </button>
    </div>
  </div>
);

const FocusBack = ({ onReview, onGotIt }) => (
  <div style={customStyles.screenContent}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', marginBottom: '24px' }}>
      <h1>Focus Mode</h1>
      <div style={customStyles.pillDark}>Case 14/50</div>
    </div>
    <div style={{ ...customStyles.card, ...customStyles.cardElevated, flex: 1, marginBottom: '24px', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'ui-rounded, "SF Pro Rounded", -apple-system, sans-serif', fontSize: '42px', color: '#00E5FF', textShadow: '0 0 12px rgba(0,229,255,0.5)', marginBottom: '8px' }}>STEMI</h1>
      <h2 style={{ color: 'rgba(255,255,255,0.6)', fontSize: '18px', marginBottom: '20px' }}>ST-Elevation Myocardial Infarction</h2>
      <span style={{ ...customStyles.pillDark, color: '#00E5FF', marginBottom: '32px' }}>ICD: I21.0</span>
      <p style={{ fontSize: '16px', lineHeight: 1.5, color: 'rgba(255,255,255,0.6)', textAlign: 'left', background: '#000', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        Anterior wall STEMI requires immediate reperfusion therapy (PCI or thrombolysis). The ECG findings in V1-V4 indicate occlusion of the Left Anterior Descending (LAD) artery.
      </p>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button className="btn-overlay" style={{ ...customStyles.btn, ...customStyles.btnGhost, flex: 1 }} onClick={onReview}>Review Again</button>
      <button className="btn-overlay" style={{ ...customStyles.btn, ...customStyles.btnGreen, flex: 1 }} onClick={onGotIt}>Got it</button>
    </div>
  </div>
);

const FocusPage = ({ activeTab, onNav }) => {
  const [flipped, setFlipped] = useState(false);
  return (
    <div style={customStyles.device}>
      <DynamicIsland />
      {flipped
        ? <FocusBack onReview={() => setFlipped(false)} onGotIt={() => setFlipped(false)} />
        : <FocusFront onFlip={() => setFlipped(true)} />
      }
      <BottomNav activeTab={activeTab} onNav={onNav} />
    </div>
  );
};

const CompeteQuestion = ({ onAnswer }) => {
  return (
    <div style={customStyles.screenContent}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', marginBottom: '24px', background: 'rgba(28,28,30,0.8)', padding: '12px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ ...customStyles.pillDark, background: '#000' }}>Q3/10</div>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'conic-gradient(#FF008A 75%, #333 0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1C1C1E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ui-rounded, "SF Pro Rounded", -apple-system, sans-serif', fontWeight: 700 }}>18</div>
        </div>
        <div style={{ ...customStyles.pillDark, background: '#000', color: '#FFD60A' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
          1,240 pts
        </div>
      </div>
      <div style={{ ...customStyles.card, padding: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '17px', lineHeight: 1.5, textAlign: 'center', color: '#FFFFFF' }}>
          45yo F presents with RUQ pain, fever, and jaundice. Ultrasound shows biliary dilation. What is the most likely diagnosis?
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 'auto' }}>
        {[
          { label: 'Acute Cholecystitis', style: customStyles.tileRed, correct: false },
          { label: 'Ascending Cholangitis', style: customStyles.tileBlue, correct: true },
          { label: 'Pancreatitis', style: { ...customStyles.tileYellow, color: '#000' }, correct: false },
          { label: 'Hepatitis A', style: customStyles.tileGreen, correct: false },
        ].map((item, i) => (
          <div
            key={i}
            className="tile-overlay"
            style={{ ...customStyles.tile, ...item.style }}
            onClick={() => onAnswer(item.correct)}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

const CompeteResult = ({ onNext }) => (
  <div style={customStyles.screenContent}>
    <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '32px' }}>
      <h1 style={{ fontFamily: 'ui-rounded, "SF Pro Rounded", -apple-system, sans-serif', fontSize: '48px', color: '#34C759', textShadow: '0 0 12px rgba(52,199,89,0.5)', marginBottom: '8px' }}>Correct!</h1>
      <div style={{ ...customStyles.pillDark, color: '#00E5FF', display: 'inline-flex' }}>Ascending Cholangitis</div>
    </div>
    <div style={{ ...customStyles.card, padding: '16px', gap: 0 }}>
      <div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.6)', paddingLeft: '8px', marginBottom: '12px' }}>Round 3 Leaderboard</div>
      {[
        { initials: 'SJ', name: 'Dr. Sarah J.', score: '2,150', trend: '↑', trendColor: '#34C759', highlight: false },
        { initials: 'You', name: 'You', score: '1,980', trend: '↑', trendColor: '#34C759', highlight: true, nameColor: '#FFD60A' },
        { initials: 'MK', name: 'MedKid99', score: '1,420', trend: '-', trendColor: 'rgba(255,255,255,0.4)', highlight: false },
      ].map((item, i, arr) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 8px',
            borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            background: item.highlight ? 'rgba(255,255,255,0.03)' : 'transparent',
            borderRadius: item.highlight ? '8px' : 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ ...customStyles.avatar, width: '36px', height: '36px', fontSize: '14px', background: item.highlight ? '#222' : '#333' }} className="avatar-ring">{item.initials}</div>
            <span style={{ fontWeight: 600, color: item.nameColor || '#FFFFFF' }}>{item.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'ui-rounded, "SF Pro Rounded", -apple-system, sans-serif', fontSize: '18px', fontWeight: 700 }}>{item.score}</span>
            <span style={{ color: item.trendColor }}>{item.trend}</span>
          </div>
        </div>
      ))}
    </div>
    <button className="btn-overlay" style={{ ...customStyles.btn, ...customStyles.btnBlue, marginTop: 'auto' }} onClick={onNext}>Next Round</button>
  </div>
);

const CompetePage = ({ activeTab, onNav }) => {
  const [answered, setAnswered] = useState(false);
  return (
    <div style={customStyles.device}>
      <DynamicIsland />
      {answered
        ? <CompeteResult onNext={() => setAnswered(false)} />
        : <CompeteQuestion onAnswer={() => setAnswered(true)} />
      }
      <BottomNav activeTab={activeTab} onNav={onNav} />
    </div>
  );
};

const BlitzPage = ({ activeTab, onNav }) => {
  const [difficulty, setDifficulty] = useState('Medium');
  const [selected, setSelected] = useState(null);
  const difficulties = ['Easy', 'Medium', 'Hard'];
  const answers = [
    { label: 'ASD', style: customStyles.tileBlue, correct: false },
    { label: 'VSD', style: customStyles.tilePink, correct: false },
    { label: 'PDA', style: customStyles.tileGreen, correct: true },
    { label: 'Tetralogy of Fallot', style: { ...customStyles.tileYellow, color: '#000' }, correct: false },
  ];
  return (
    <div style={customStyles.device}>
      <DynamicIsland />
      <div style={customStyles.screenContent}>
        <div style={{ marginTop: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#1C1C1E', borderRadius: '999px', padding: '4px', display: 'flex', border: '1px solid rgba(255,255,255,0.05)' }}>
            {difficulties.map(d => (
              <div
                key={d}
                style={{
                  flex: 1, textAlign: 'center', padding: '8px', fontSize: '13px', fontWeight: 600,
                  color: difficulty === d ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                  background: difficulty === d ? '#141415' : 'transparent',
                  borderRadius: difficulty === d ? '999px' : 0,
                  boxShadow: difficulty === d ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ ...customStyles.pillDark, color: '#FFD60A', borderColor: 'rgba(255,214,10,0.3)' }}>🔥 12 Streak</div>
        </div>
        <div style={{ height: '4px', background: '#333', borderRadius: '2px', marginBottom: '32px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '65%', background: 'linear-gradient(90deg, #FF008A, #FFD60A)', borderRadius: '2px' }}></div>
        </div>
        <div style={{ ...customStyles.card, ...customStyles.cardElevated, marginBottom: '32px', minHeight: '180px', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'ui-rounded, "SF Pro Rounded", -apple-system, sans-serif', fontSize: '28px', lineHeight: 1.3 }}>"Machine-like" murmur in a neonate.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 'auto' }}>
          {answers.map((item, i) => (
            <div
              key={i}
              className="tile-overlay"
              style={{
                ...customStyles.tile,
                ...item.style,
                minHeight: '80px',
                padding: '12px',
                fontSize: '14px',
                outline: selected === i ? '3px solid #FFFFFF' : 'none',
              }}
              onClick={() => setSelected(i)}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
      <BottomNav activeTab={activeTab} onNav={onNav} />
    </div>
  );
};

const ProfilePage = ({ activeTab, onNav }) => {
  const [showReset, setShowReset] = useState(false);
  return (
    <div style={customStyles.device}>
      <DynamicIsland />
      <div style={customStyles.screenContentScrollable}>
        <h1 style={{ marginTop: '20px', marginBottom: '24px' }}>Profile</h1>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div className="avatar-ring" style={{ ...customStyles.avatar, width: '96px', height: '96px', fontSize: '32px', marginBottom: '16px' }}>SJ</div>
          <h2 style={{ fontFamily: 'ui-rounded, "SF Pro Rounded", -apple-system, sans-serif' }}>Dr. Sarah Jenkins</h2>
          <div style={{ ...customStyles.pillDark, marginTop: '8px', color: '#00E5FF', borderColor: 'rgba(0,229,255,0.3)' }}>Level 12 — Intern</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
          {[
            { value: '1,402', label: 'Total Cases', color: '#FFFFFF' },
            { value: '68%', label: 'Win Rate', color: '#34C759' },
            { value: '42', label: 'Best Streak', color: '#FFD60A' },
            { value: '850', label: 'Avg Score', color: '#00E5FF' },
          ].map((stat, i) => (
            <div key={i} style={{ ...customStyles.card, padding: '16px', alignItems: 'center', gap: '4px' }}>
              <div style={{ fontFamily: 'ui-rounded, "SF Pro Rounded", -apple-system, sans-serif', fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.6)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>Recent Sessions</div>
        <div style={{ ...customStyles.card, padding: 0, marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Blitz Mode - Hard</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Today, 2:40 PM</div>
            </div>
            <div style={{ ...customStyles.pillAccent, background: 'rgba(52,199,89,0.1)', color: '#34C759' }}>+240 XP</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Focus - Cardiology</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Yesterday</div>
            </div>
            <div style={{ ...customStyles.pillAccent, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>Completed</div>
          </div>
        </div>
        {showReset
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: '14px' }}>Are you sure you want to reset all stats?</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-overlay" style={{ ...customStyles.btn, ...customStyles.btnGhost, flex: 1 }} onClick={() => setShowReset(false)}>Cancel</button>
                <button className="btn-overlay" style={{ ...customStyles.btn, background: 'linear-gradient(135deg, #FF453A, #FF3B30)', flex: 1 }} onClick={() => setShowReset(false)}>Reset</button>
              </div>
            </div>
          : <button className="btn-overlay" style={{ ...customStyles.btn, ...customStyles.btnGhost, color: '#FF453A' }} onClick={() => setShowReset(true)}>Reset Stats</button>
        }
      </div>
      <BottomNav activeTab={activeTab} onNav={onNav} />
    </div>
  );
};

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('Focus');
  const navigate = useNavigate();

  const handleNav = (tab) => {
    setActiveTab(tab);
    const routes = { Focus: '/', Compete: '/compete', Blitz: '/blitz', Profile: '/profile' };
    navigate(routes[tab]);
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = globalCSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className="rxarena-app">
      <Routes>
        <Route path="/" element={<FocusPage activeTab={activeTab} onNav={handleNav} />} />
        <Route path="/compete" element={<CompetePage activeTab={activeTab} onNav={handleNav} />} />
        <Route path="/blitz" element={<BlitzPage activeTab={activeTab} onNav={handleNav} />} />
        <Route path="/profile" element={<ProfilePage activeTab={activeTab} onNav={handleNav} />} />
      </Routes>
    </div>
  );
};

const App = () => {
  return (
    <Router basename="/">
      <AppContent />
    </Router>
  );
};

export default App;