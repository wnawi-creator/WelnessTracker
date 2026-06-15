import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import './app.css';

// ─── COLOUR / BRAND TOKENS (kept in JS for the bubble gradient only) ──────────
const GRAD = 'linear-gradient(135deg, #c1692a 0%, #8a4a1e 100%)';

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <main className="content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/stressor-map" element={<StressorMap />} />
            <Route path="/breathwork" element={<Breathwork />} />
            <Route path="/commitment" element={<Commitment />} />
            <Route path="/basic-exercise" element={<BasicExercise />} />
            <Route path="/reflection" element={<Reflection />} />
            <Route path="/key-concepts" element={<KeyConcepts />} />
            <Route path="/summary" element={<Summary />} />
          </Routes>
        </main>
        <BottomNav />
        <Footer />
      </div>
    </Router>
  );
}

function Header() {
  return (
    <header className="header">
      <p className="eyebrow">WNAWI WORKSHOP COMPANION</p>
      <h1>Stress less. Perform more.</h1>
    </header>
  );
}

function BottomNav() {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Overview', icon: '⊙' },
    { path: '/stressor-map', label: 'Stressors', icon: '◈' },
    { path: '/breathwork', label: 'Breathwork', icon: '◉' },
    { path: '/commitment', label: 'Commitment', icon: '◎' },
    { path: '/basic-exercise', label: 'Exercise', icon: '△' },
    { path: '/reflection', label: 'Reflection', icon: '◇' },
    { path: '/key-concepts', label: 'Concepts', icon: '≡' },
  ];
  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <Link key={item.path} to={item.path} className={location.pathname === item.path ? 'active' : ''}>
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <h3>WNAWI Workshop</h3>
      <p>Stress Less, Perform More is a workshop on understanding and managing chronic stress. This companion saves your notes privately on your own device — nothing is sent anywhere.</p>
      <div className="footer-links">
        <a href="https://wnawiworkshop.com" target="_blank" rel="noopener noreferrer">wnawiworkshop.com</a>
        <a href="https://instagram.com/timm.desire" target="_blank" rel="noopener noreferrer">Instagram @timm.desire</a>
      </div>
      <p className="location">Gauteng, South Africa</p>
    </footer>
  );
}

// ─── WEEKLY TRACKING HELPERS ──────────────────────────────────────────────────
// Each daily activity stores a list of day-keys like "Mon","Tue"… for the current week.
// Commitment and Reflection store a simple boolean per week.

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDaysLogged(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function getDayPct(key: string): number {
  return Math.min(getDaysLogged(key).length / 7, 1);
}

function getOneTimeDone(key: string): boolean {
  return localStorage.getItem(key) === 'done';
}

// Overview weekly summary: fraction 0–1 per journey item
function getWeeklyProgress(): { path: string; pct: number; done: boolean }[] {
  const stressorDays   = getDayPct('stressorDays');
  const breathworkDays = getDayPct('breathworkDays');
  const exerciseDays   = getDayPct('basicExerciseDays');
  const commitDone     = getOneTimeDone('commitmentDone');
  const reflectDone    = getOneTimeDone('reflectionDone');

  return [
    { path: '/stressor-map',   pct: stressorDays,   done: stressorDays   >= 1 },
    { path: '/breathwork',     pct: breathworkDays,  done: breathworkDays >= 1 },
    { path: '/commitment',     pct: commitDone ? 1 : 0,  done: commitDone },
    { path: '/basic-exercise', pct: exerciseDays,    done: exerciseDays   >= 1 },
    { path: '/reflection',     pct: reflectDone ? 1 : 0, done: reflectDone },
  ];
}

// ─── RING SVG ────────────────────────────────────────────────────────────────
function RingProgress({ pct, size = 44 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const done = pct >= 1;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8e0d5" strokeWidth={4} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={done ? '#5a7a3a' : '#c1692a'}
        strokeWidth={4}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      {done && (
        <text x={size/2} y={size/2 + 5} textAnchor="middle" fontSize="13" fill="#5a7a3a" fontWeight="700">✓</text>
      )}
      {!done && (
        <text x={size/2} y={size/2 + 4} textAnchor="middle" fontSize="10" fill="#8a7060" fontWeight="700">
          {Math.round(pct * 7)}/7
        </text>
      )}
    </svg>
  );
}

// ─── OVERVIEW ────────────────────────────────────────────────────────────────

function Overview() {
  const [reminderTime, setReminderTime] = useState(localStorage.getItem('reminderTime') || '');
  const [reminderMsg, setReminderMsg] = useState('');
  const [weekData, setWeekData] = useState<ReturnType<typeof getWeeklyProgress>>([]);

  useEffect(() => { setWeekData(getWeeklyProgress()); }, []);

  const enableReminders = async () => {
    if (!('Notification' in window)) { setReminderMsg('tip'); return; }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        localStorage.setItem('reminderTime', reminderTime);
        setReminderMsg('success');
      } else { setReminderMsg('tip'); }
    } catch { setReminderMsg('tip'); }
  };

  const resetWeek = () => {
    if (!confirm('Reset the whole week? This clears all daily tracking, breathwork cycles and notes, your commitment and reflection for a fresh start. Your stressor list is kept.')) return;
    ['stressorDays','breathworkDays','basicExerciseDays'].forEach(k => localStorage.removeItem(k));
    ['exhale','box','478','double'].forEach(id => { localStorage.removeItem(`cycles_${id}`); localStorage.removeItem(`notes_${id}`); });
    localStorage.removeItem('reflectionDone');
    localStorage.removeItem('commitmentDone');
    localStorage.removeItem('commitment');
    setWeekData(getWeeklyProgress());
  };

  const journey = [
    { num: '01', title: 'Stressor map',      desc: 'Track daily — surface what you carry across four categories',           path: '/stressor-map',   type: 'daily' },
    { num: '02', title: 'Breathwork',         desc: 'Track daily — four guided techniques to shift your nervous system',     path: '/breathwork',     type: 'daily' },
    { num: '03', title: 'Micro-commitment',   desc: 'Complete once per week — a specific, tiny practice you will keep',      path: '/commitment',     type: 'once' },
    { num: '04', title: 'Basic Exercise',     desc: 'Track daily — Stanley Rosenberg vagus nerve reset',                    path: '/basic-exercise', type: 'daily' },
    { num: '05', title: 'Reflection',         desc: 'Complete once per week — what shifted and what you carry forward',      path: '/reflection',     type: 'once' },
  ];

  const doneCount = weekData.filter(w => w.done).length;
  const overallPct = weekData.length ? weekData.reduce((a, w) => a + w.pct, 0) / weekData.length : 0;

  return (
    <div className="page overview">
      <p className="intro">A private companion to the workshop. Notice, reflect, and track what shifts. Everything is saved quietly on your own device — nothing is sent anywhere.</p>

      <section>
        <div className="journey-header">
          <div>
            <h2>This week</h2>
            <p className="subtext">Reset every Monday for a fresh week.</p>
          </div>
          <button className="reset-week-btn" onClick={resetWeek}>Reset week ↺</button>
        </div>

        <div className="overall-bar-row">
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${overallPct * 100}%` }} />
          </div>
          <span className="progress-label">{doneCount}/{journey.length} complete</span>
        </div>

        {journey.map((item, i) => {
          const wd = weekData[i];
          const pct = wd?.pct ?? 0;
          return (
            <Link to={item.path} key={item.num} className={`journey-card ${wd?.done ? 'completed' : ''}`}>
              <RingProgress pct={pct} />
              <div className="journey-body">
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
              <span className="journey-arrow">›</span>
            </Link>
          );
        })}

        <p className="week-hint">Daily tasks track each day you practise (Mon–Sun). One-time tasks are done for the week once completed. Use "Reset week" each Monday to start fresh.</p>
      </section>

      <section>
        <h3 className="section-label">YOUR SUMMARY</h3>
        <p>Export a personal PDF of your stressor map, commitment and reflections — a keepsake to take away from the workshop.</p>
        <Link to="/summary" className="btn-primary export-btn">
          📄 View &amp; Export My Summary
        </Link>
      </section>

      <section>
        <h3 className="section-label">DAILY PRACTICE TIPS</h3>
        <p>Pair each breathwork session with an existing habit — coffee, commute, or the first email open.</p>
        <p style={{ marginTop: 8 }}>Track regulation, not perfection. Three minutes a day count.</p>
        <p style={{ marginTop: 8 }}>Name the stressor out loud. Vagus pressure shrinks when it is specific.</p>
      </section>

      <section>
        <h3 className="section-label">FOR YOUR TEAM</h3>
        <p>Bring this workshop to your workplace</p>
        <p style={{ marginTop: 8 }}>In-person sessions for teams who want fewer burnouts and better focus.</p>
        <a href="https://wnawiworkshop.com" target="_blank" rel="noopener noreferrer" className="btn-primary">
          Visit WNAWI Workshop
        </a>
      </section>

      <section>
        <h3 className="section-label">DAILY REGULATION REMINDER</h3>
        <p>Save this page to your phone's home screen for easy daily access. Then set a time below to remind yourself to practise.</p>
        <div className="reminder-setter">
          <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
          <button onClick={enableReminders} className="btn-secondary">Set reminder</button>
        </div>
        {reminderMsg === 'success' && (
          <div className="reminder-feedback success">✓ Reminder saved for {reminderTime}. Keep this tab open for it to fire.</div>
        )}
        {reminderMsg === 'tip' && (
          <div className="reminder-feedback tip">
            <strong>Tip:</strong> Browser reminders aren't supported here. Add this page to your home screen instead — tap your browser menu and choose "Add to Home Screen", then set a phone alarm for your practice time.
          </div>
        )}
      </section>

      <ShareSection />

      <section>
        <h3 className="section-label">ADDITIONAL ONLINE COURSE</h3>
        <p><strong>Stress Management: Awareness and Nervous System</strong></p>
        <p style={{ marginTop: 8 }}>Go deeper with a self-paced online course that builds a regulation practice to hold under real pressure.</p>
        <a
          href="https://www.udemy.com/course/stress-management-awareness-nervous-system/?referralCode=3C69F7C7BF7F2883E3B8"
          target="_blank" rel="noopener noreferrer" className="btn-primary"
        >
          View Course on Udemy
        </a>
      </section>
    </div>
  );
}

// ─── SHARE SECTION ───────────────────────────────────────────────────────────

function ShareSection() {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.origin + window.location.pathname.replace(/\/$/, '').split('/').slice(0, -0).join('/');
    const appUrl = window.location.origin;
    const message =
      `Hi! 👋\n\nHere's your companion app for the WNAWI "Stress Less, Perform More" workshop:\n\n${appUrl}\n\nSave it to your phone's home screen for easy daily access — tap your browser menu and choose "Add to Home Screen".\n\nUse it to map your stressors, practise breathwork, track your daily exercises and export your personal summary. Everything stays private on your device.\n\nEnjoy the practice! 🌿`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'WNAWI Workshop Companion', text: message, url: appUrl });
        return;
      }
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 3500);
    } catch {
      // fallback: try clipboard only
      try {
        await navigator.clipboard.writeText(appUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3500);
      } catch { /* ignore */ }
    }
  };

  return (
    <section>
      <h3 className="section-label">SHARE WITH PARTICIPANTS</h3>
      <p>Send this app to everyone who attended the workshop — they get their own private companion, saved on their own device.</p>
      <button className="share-btn" onClick={share}>
        {copied ? (
          <><span className="share-icon">✓</span> Message copied — paste into WhatsApp or email</>
        ) : (
          <><span className="share-icon">↗</span> Share this app with participants</>
        )}
      </button>
      {copied && (
        <p className="share-hint">Paste the message into WhatsApp, email, or wherever you communicate with your group.</p>
      )}
    </section>
  );
}

// ─── STRESSOR MAP ─────────────────────────────────────────────────────────────

type Category = 'Physical' | 'Mental' | 'Emotional' | 'Environmental';
const CATEGORIES: Category[] = ['Physical', 'Mental', 'Emotional', 'Environmental'];

function StressorMap() {
  const [stressors, setStressors] = useState<Record<Category, string[]>>(() => {
    try { return JSON.parse(localStorage.getItem('stressors') || '{}'); } catch { return { Physical: [], Mental: [], Emotional: [], Environmental: [] }; }
  });
  const [inputs, setInputs] = useState<Record<Category, string>>({ Physical: '', Mental: '', Emotional: '', Environmental: '' });
  const [themes, setThemes] = useState(localStorage.getItem('stressorThemes') || '');
  const [days, setDays] = useState<string[]>(getDaysLogged('stressorDays'));

  useEffect(() => { localStorage.setItem('stressors', JSON.stringify(stressors)); }, [stressors]);
  useEffect(() => { localStorage.setItem('stressorThemes', themes); }, [themes]);
  useEffect(() => { localStorage.setItem('stressorDays', JSON.stringify(days)); }, [days]);

  const addStressor = (cat: Category) => {
    if (!inputs[cat].trim()) return;
    setStressors(prev => ({ ...prev, [cat]: [...(prev[cat] || []), inputs[cat].trim()] }));
    setInputs(prev => ({ ...prev, [cat]: '' }));
  };

  const removeStressor = (cat: Category, idx: number) => {
    setStressors(prev => ({ ...prev, [cat]: prev[cat].filter((_, i) => i !== idx) }));
  };

  const toggleDay = (day: string) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const resetAll = () => {
    if (!confirm('Clear all stressors, themes and this week\'s day ticks?')) return;
    const empty = { Physical: [], Mental: [], Emotional: [], Environmental: [] };
    setStressors(empty);
    setThemes('');
    setDays([]);
    localStorage.removeItem('stressors');
    localStorage.removeItem('stressorThemes');
    localStorage.removeItem('stressorDays');
  };

  const total = Object.values(stressors).flat().length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>01 — Stressor map</h2>
          <p className="page-subtitle">Daily practice · Reset weekly</p>
        </div>
        <button className="reset-btn" onClick={resetAll}>Reset</button>
      </div>

      <WeeklyDayTracker days={days} onToggle={toggleDay} label="Days practised this week" />

      {total > 0 && <p className="activity-progress">{total} stressor{total !== 1 ? 's' : ''} mapped</p>}

      {CATEGORIES.map(cat => (
        <div key={cat} className="category-block">
          <h3>{cat}</h3>
          <div className="input-row">
            <input
              value={inputs[cat]}
              onChange={(e) => setInputs(prev => ({ ...prev, [cat]: e.target.value }))}
              placeholder={`Add a ${cat.toLowerCase()} stressor`}
              onKeyDown={(e) => e.key === 'Enter' && addStressor(cat)}
            />
            <button onClick={() => addStressor(cat)}>+ Add</button>
          </div>
          {(stressors[cat] || []).length > 0 && (
            <>
              <p className="counter">{stressors[cat].length} noted</p>
              <ul className="stressor-list">
                {stressors[cat].map((s, i) => (
                  <li key={i}>
                    <span>{s}</span>
                    <button className="remove-btn" onClick={() => removeStressor(cat, i)}>×</button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ))}
      <div className="category-block">
        <h3>Common themes you notice</h3>
        <textarea
          value={themes}
          onChange={(e) => setThemes(e.target.value)}
          placeholder="What patterns do you see across categories?"
          rows={4}
        />
      </div>
    </div>
  );
}

// ─── SHARED WEEKLY DAY TRACKER COMPONENT ──────────────────────────────────────

function WeeklyDayTracker({ days, onToggle, label }: { days: string[]; onToggle: (d: string) => void; label: string }) {
  const count = days.length;
  return (
    <div className="tracker">
      <div className="tracker-header">
        <h4>{label}</h4>
        <span className="tracker-count">{count}/7 days</span>
      </div>
      <div className="tracker-bar-wrap">
        <div className="tracker-bar-fill" style={{ width: `${(count / 7) * 100}%` }} />
      </div>
      <div className="days">
        {WEEK_DAYS.map(day => (
          <button
            key={day}
            className={days.includes(day) ? 'day-completed' : 'day'}
            onClick={() => onToggle(day)}
          >
            <span className="day-label">{day}</span>
            <span className="day-check">{days.includes(day) ? '✓' : ''}</span>
          </button>
        ))}
      </div>
      <p className="hint">Tap a day to mark it done. Tap again to undo. Reset weekly.</p>
    </div>
  );
}

// ─── BREATHWORK ───────────────────────────────────────────────────────────────

interface BreathVariant { label: string; inhale: number; hold1: number; exhale: number; hold2: number; }

interface BreathworkTechniqueProps {
  name: string;
  desc: string;
  id: string;
  variants: BreathVariant[];
}

function BreathworkTechnique({ name, desc, id, variants }: BreathworkTechniqueProps) {
  const [variantIdx, setVariantIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState('Inhale');
  const [count, setCount] = useState(variants[0].inhale);
  const [cycles, setCycles] = useState(() => parseInt(localStorage.getItem(`cycles_${id}`) || '0'));
  const [notes, setNotes] = useState(() => localStorage.getItem(`notes_${id}`) || '');
  const [scale, setScale] = useState(1);
  const variant = variants[variantIdx];

  // Stop and reset timer when variant changes
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    setRunning(false);
    setPhase('Inhale');
    setCount(variant.inhale);
    setScale(1);
  }, [variantIdx, variant.inhale]);

  useEffect(() => { localStorage.setItem(`cycles_${id}`, cycles.toString()); }, [cycles, id]);
  useEffect(() => { localStorage.setItem(`notes_${id}`, notes); }, [notes, id]);

  useEffect(() => {
    if (!running) return;
    const v = variant;
    const interval = setInterval(() => {
      setCount(c => {
        if (c > 1) return c - 1;
        const cur = phaseRef.current;
        if (cur === 'Inhale') {
          if (v.hold1 > 0) { setPhase('Hold'); setScale(1); return v.hold1; }
          setPhase('Exhale'); setScale(0.6); return v.exhale;
        }
        if (cur === 'Hold' && phaseRef.current === 'Hold') {
          setPhase('Exhale'); setScale(0.6); return v.exhale;
        }
        if (cur === 'Exhale') {
          if (v.hold2 > 0) { setPhase('Hold2'); setScale(0.5); return v.hold2; }
          setPhase('Inhale'); setScale(1); setCycles(prev => prev + 1); return v.inhale;
        }
        // Hold2 (post-exhale hold) → back to Inhale
        setPhase('Inhale'); setScale(1); setCycles(prev => prev + 1); return v.inhale;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, variant]);

  const stopReset = () => {
    setRunning(false);
    setPhase('Inhale');
    setCount(variant.inhale);
    setScale(1);
  };

  const fullReset = () => {
    stopReset();
    setCycles(0);
    setNotes('');
    localStorage.removeItem(`cycles_${id}`);
    localStorage.removeItem(`notes_${id}`);
  };

  return (
    <div className="breath-card">
      <div className="breath-card-header">
        <h3>{name}</h3>
        <button className="reset-btn-sm" onClick={fullReset} title="Reset cycles and notes">↺</button>
      </div>
      <p className="breath-desc">{desc}</p>

      {variants.length > 1 && (
        <div className="variant-selector">
          {variants.map((v, i) => (
            <button
              key={v.label}
              className={i === variantIdx ? 'variant-btn active' : 'variant-btn'}
              onClick={() => setVariantIdx(i)}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      <div className="breath-bubble" style={{ background: GRAD, transform: `scale(${scale})` }}>
        <div className="breath-text"><p>{phase === 'Hold2' ? 'Hold' : phase}<br />{count}</p></div>
      </div>

      <div className="breath-controls">
        <button className="ctrl-start" onClick={() => setRunning(!running)}>{running ? 'Pause' : 'Start'}</button>
        <button className="ctrl-reset" onClick={stopReset}>Reset</button>
      </div>
      <p className="cycles-count">Cycles completed: <strong>{cycles}</strong></p>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What I noticed during this session" rows={2} />
    </div>
  );
}

function Breathwork() {
  const [days, setDays] = useState<string[]>(getDaysLogged('breathworkDays'));
  useEffect(() => { localStorage.setItem('breathworkDays', JSON.stringify(days)); }, [days]);
  const toggleDay = (day: string) => setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const techniques: BreathworkTechniqueProps[] = [
    {
      id: 'exhale',
      name: 'Extended Exhale',
      desc: 'A longer exhale reliably activates the parasympathetic nervous system. The longer the exhale, the stronger the effect.',
      variants: [
        { label: '4 / 6', inhale: 4, hold1: 0, exhale: 6, hold2: 0 },
        { label: '4 / 8', inhale: 4, hold1: 0, exhale: 8, hold2: 0 },
      ],
    },
    {
      id: 'box',
      name: 'Box Breathing',
      desc: 'Used by Navy SEALs to stay calm under pressure. Equal sides create balance between sympathetic and parasympathetic.',
      variants: [
        { label: '4 / 4 / 4 / 4', inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
        { label: '5 / 5 / 5 / 5', inhale: 5, hold1: 5, exhale: 5, hold2: 5 },
      ],
    },
    {
      id: '478',
      name: '4-7-8 Breathing',
      desc: 'Dr. Andrew Weil\'s relaxation technique. The extended hold and long exhale create a powerful calming effect.',
      variants: [
        { label: '4 / 7 / 8', inhale: 4, hold1: 7, exhale: 8, hold2: 0 },
      ],
    },
    {
      id: 'double',
      name: 'Double-up Exhale',
      desc: 'Exhale twice as long as the inhale. Emily Fletcher 3D technique — simple ratio, strong parasympathetic activation.',
      variants: [
        { label: '2 / 4', inhale: 2, hold1: 0, exhale: 4, hold2: 0 },
        { label: '3 / 6', inhale: 3, hold1: 0, exhale: 6, hold2: 0 },
        { label: '4 / 8', inhale: 4, hold1: 0, exhale: 8, hold2: 0 },
      ],
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>02 — Breathwork</h2>
          <p className="page-subtitle">Daily practice · Reset weekly</p>
        </div>
      </div>

      <WeeklyDayTracker days={days} onToggle={toggleDay} label="Days practised this week" />

      <p className="breathwork-intro">Choose a technique, select your preferred ratio, then press Start. Each technique has variant ratios — tap to switch before starting.</p>

      {techniques.map(t => <BreathworkTechnique key={t.id} {...t} />)}
    </div>
  );
}

// ─── COMMITMENT ───────────────────────────────────────────────────────────────

function Commitment() {
  const fields = [
    'My primary signal that I am entering chronic stress',
    'My chosen breathwork technique',
    'When I will practise it (time and trigger)',
    'One stress-driving belief I am willing to begin questioning',
    'Vagus nerve reset — how often each week',
    'One person I will share this commitment with',
  ];

  const [data, setData] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('commitment') || '{}'); } catch { return {}; }
  });
  const [done, setDone] = useState(getOneTimeDone('commitmentDone'));

  useEffect(() => { localStorage.setItem('commitment', JSON.stringify(data)); }, [data]);

  useEffect(() => {
    const allFilled = fields.every(f => data[f]?.trim());
    if (allFilled && !done) {
      localStorage.setItem('commitmentDone', 'done');
      setDone(true);
    }
  }, [data, done, fields]);

  const copySummary = () => {
    const text = fields.map(f => `${f}:\n${data[f] || '—'}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() => alert('Commitment copied to clipboard.'));
  };

  const reset = () => {
    if (!confirm('Clear all commitment fields and mark as incomplete for this week?')) return;
    setData({});
    setDone(false);
    localStorage.removeItem('commitment');
    localStorage.removeItem('commitmentDone');
  };

  const filledCount = fields.filter(f => data[f]?.trim()).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>03 — Micro-commitment</h2>
          <p className="page-subtitle">Complete once per week · Reset to redo</p>
        </div>
        <button className="reset-btn" onClick={reset}>Reset</button>
      </div>

      {done ? (
        <div className="done-banner">
          <span className="done-icon">✓</span>
          <div>
            <strong>Commitment locked in for this week</strong>
            <p>All 6 of 6 fields complete. Reset to update your commitment.</p>
          </div>
        </div>
      ) : (
        <p className="activity-progress">{filledCount} of {fields.length} fields filled</p>
      )}

      {fields.map(field => (
        <div key={field} className="input-block">
          <label>{field}</label>
          <input
            value={data[field] || ''}
            onChange={(e) => setData(prev => ({ ...prev, [field]: e.target.value }))}
          />
        </div>
      ))}
      <button onClick={copySummary} className="btn-primary" style={{ marginTop: 8 }}>Copy commitment summary</button>
    </div>
  );
}

// ─── BASIC EXERCISE ───────────────────────────────────────────────────────────

function BasicExercise() {
  const [days, setDays] = useState<string[]>(getDaysLogged('basicExerciseDays'));
  const [notes, setNotes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('basicExerciseNotes') || '["",""]'); } catch { return ['', '']; }
  });

  useEffect(() => { localStorage.setItem('basicExerciseDays', JSON.stringify(days)); }, [days]);
  useEffect(() => { localStorage.setItem('basicExerciseNotes', JSON.stringify(notes)); }, [notes]);

  const toggleDay = (day: string) => setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const reset = () => {
    if (!confirm('Clear this week\'s tracker and notes?')) return;
    setDays([]);
    setNotes(['', '']);
    localStorage.removeItem('basicExerciseDays');
    localStorage.removeItem('basicExerciseNotes');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>04 — Basic Exercise</h2>
          <p className="page-subtitle">Daily practice · Reset weekly each Monday</p>
        </div>
        <button className="reset-btn" onClick={reset}>Reset</button>
      </div>

      <WeeklyDayTracker days={days} onToggle={toggleDay} label="Days practised this week" />

      <div className="exercise-steps">
        {[
          { title: 'Check your neck rotation', body: 'Turn your head left and right. Note any tightness or restriction.' },
          { title: 'Lie down, hands behind head', body: 'Interlace fingers, cradle the back of your skull. Elbows wide and flat.' },
          { title: 'Eyes to the right — hold', body: 'Keep your head still, move only your eyes to the right. Stay until you sigh, yawn, or swallow (30–60 sec).' },
          { title: 'Eyes to the left — hold', body: 'Repeat on the left side. Notice any release, softening, or relaxation.' },
        ].map((step, i) => (
          <div className="step" key={i}>
            <span className="step-num">{i + 1}</span>
            <div><h4>{step.title}</h4><p>{step.body}</p></div>
          </div>
        ))}
      </div>

      <div className="tips">
        <h4>Tips</h4>
        <p>Best done before sleep or after stressful moments. If you feel dizzy or uncomfortable, stop and sit up slowly.</p>
      </div>

      <div className="input-block">
        <label>What shifted after practising</label>
        <textarea value={notes[0]} onChange={(e) => setNotes([e.target.value, notes[1]])} rows={3} placeholder="Any physical or mental shifts you notice…" />
      </div>
      <div className="input-block">
        <label>How I will use this in my week</label>
        <textarea value={notes[1]} onChange={(e) => setNotes([notes[0], e.target.value])} rows={3} placeholder="When and where will you build this habit…" />
      </div>
    </div>
  );
}

// ─── REFLECTION ───────────────────────────────────────────────────────────────

function Reflection() {
  const prompts = [
    'One thing that genuinely surprised or shifted something in me this week',
    'One insight I want to carry into the week ahead',
    'The very next small step I will take, today or tomorrow',
  ];

  const [data, setData] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('reflection') || '{}'); } catch { return {}; }
  });
  const [done, setDone] = useState(getOneTimeDone('reflectionDone'));

  useEffect(() => { localStorage.setItem('reflection', JSON.stringify(data)); }, [data]);

  useEffect(() => {
    const allFilled = prompts.every(p => data[p]?.trim());
    if (allFilled && !done) {
      localStorage.setItem('reflectionDone', 'done');
      setDone(true);
    }
  }, [data, done, prompts]);

  const reset = () => {
    if (!confirm('Clear all reflection answers and mark as incomplete for this week?')) return;
    setData({});
    setDone(false);
    localStorage.removeItem('reflection');
    localStorage.removeItem('reflectionDone');
  };

  const filledCount = prompts.filter(p => data[p]?.trim()).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>05 — Reflection</h2>
          <p className="page-subtitle">Complete once per week · Reset to redo</p>
        </div>
        <button className="reset-btn" onClick={reset}>Reset</button>
      </div>

      {done ? (
        <div className="done-banner">
          <span className="done-icon">✓</span>
          <div>
            <strong>Reflection complete for this week</strong>
            <p>All 3 of 3 prompts answered. Reset to reflect again.</p>
          </div>
        </div>
      ) : (
        <p className="activity-progress">{filledCount} of {prompts.length} prompts answered</p>
      )}

      {prompts.map((prompt, i) => (
        <div key={i} className="input-block">
          <label>{prompt}</label>
          {i === 2 && <p className="hint">Keep it tiny enough that it is almost embarrassing not to do.</p>}
          <textarea value={data[prompt] || ''} onChange={(e) => setData(prev => ({ ...prev, [prompt]: e.target.value }))} rows={4} />
        </div>
      ))}
    </div>
  );
}

// ─── KEY CONCEPTS ─────────────────────────────────────────────────────────────

function KeyConcepts() {
  const [search, setSearch] = useState('');
  const concepts = [
    { title: 'Acute Stress', desc: 'Short-term response to an immediate challenge. Mobilises energy, sharpens focus, then recovers once the threat passes.' },
    { title: 'Chronic Stress', desc: 'Ongoing activation without recovery. Depletes reserves over time, impairing sleep, immunity, and cognitive function.' },
    { title: 'Amygdala', desc: 'The brain\'s alarm system. Detects threat and triggers the fight, flight, or freeze response before the thinking brain can intervene.' },
    { title: 'Cortisol and Adrenaline', desc: 'Stress hormones that increase heart rate, blood pressure, and blood glucose to prepare the body for action.' },
    { title: 'Vagus Nerve', desc: 'The primary parasympathetic pathway. Signals safety to the body, slows heart rate, aids digestion, and enables social connection.' },
    { title: 'Polyvagal Theory', desc: 'Framework by Stephen Porges describing three autonomic states: ventral vagal (safety), sympathetic (fight/flight), and dorsal vagal (shutdown/freeze).' },
    { title: 'Window of Tolerance', desc: 'The optimal zone where you can think, feel, and act effectively under pressure — neither hyper- nor hypo-aroused.' },
    { title: 'Neuroception', desc: 'The nervous system\'s unconscious scanning for safety or danger — happening before conscious thought.' },
    { title: 'Parasympathetic Nervous System', desc: 'The "rest and digest" branch. Activated by slow exhalation, cold water on the face, humming, and safe social cues.' },
    { title: 'Sympathetic Nervous System', desc: 'The "fight or flight" branch. Designed for short bursts of stress response, not sustained daily activation.' },
  ];
  const filtered = concepts.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.desc.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="page">
      <h2>Key concepts</h2>
      <p className="page-subtitle">Reference guide from the workshop</p>
      <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search concepts…" style={{ marginBottom: 20 }} />
      {filtered.map(c => (
        <div key={c.title} className="concept-card">
          <h3>{c.title}</h3>
          <p>{c.desc}</p>
        </div>
      ))}
      <div className="attributions">
        <h4>Attributions and references</h4>
        <p>Stanley Rosenberg — Accessing the Healing Power of the Vagus Nerve</p>
        <p>Stephen Porges — Polyvagal Theory</p>
        <p>Dr. Andrew Weil — 4-7-8 Breathing technique</p>
        <p>Emily Fletcher — Ziva Meditation / Double-up Exhale</p>
      </div>
    </div>
  );
}

// ─── SUMMARY / PDF EXPORT ────────────────────────────────────────────────────

function Summary() {
  const today = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

  // Load all saved data
  const stressors: Record<string, string[]> = (() => {
    try { return JSON.parse(localStorage.getItem('stressors') || '{}'); } catch { return {}; }
  })();
  const themes = localStorage.getItem('stressorThemes') || '';

  const commitmentFields = [
    'My primary signal that I am entering chronic stress',
    'My chosen breathwork technique',
    'When I will practise it (time and trigger)',
    'One stress-driving belief I am willing to begin questioning',
    'Vagus nerve reset — how often each week',
    'One person I will share this commitment with',
  ];
  const commitment: Record<string, string> = (() => {
    try { return JSON.parse(localStorage.getItem('commitment') || '{}'); } catch { return {}; }
  })();

  const reflectionPrompts = [
    'One thing that genuinely surprised or shifted something in me this week',
    'One insight I want to carry into the week ahead',
    'The very next small step I will take, today or tomorrow',
  ];
  const reflection: Record<string, string> = (() => {
    try { return JSON.parse(localStorage.getItem('reflection') || '{}'); } catch { return {}; }
  })();

  const stressorDays  = getDaysLogged('stressorDays');
  const breathDays    = getDaysLogged('breathworkDays');
  const exerciseDays  = getDaysLogged('basicExerciseDays');

  const totalStressors = Object.values(stressors).flat().length;
  const hasAnyData = totalStressors > 0 ||
    commitmentFields.some(f => commitment[f]?.trim()) ||
    reflectionPrompts.some(p => reflection[p]?.trim());

  const generatePDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const margin = 18;
    const contentW = pageW - margin * 2;
    let y = 0;

    const C = { terra: [193, 105, 42] as [number,number,number], dark: [42, 32, 24] as [number,number,number], muted: [122, 106, 88] as [number,number,number], white: [255, 255, 255] as [number,number,number] };

    const checkPage = (needed: number) => {
      if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
    };

    // ── Header bar ──
    doc.setFillColor(...C.terra);
    doc.rect(0, 0, pageW, 34, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('WNAWI WORKSHOP  ·  STRESS LESS. PERFORM MORE.', margin, 12);
    doc.setFontSize(15);
    doc.text('My Practice Summary', margin, 24);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(today, pageW - margin, 24, { align: 'right' });
    y = 42;

    // ── Intro ──
    doc.setTextColor(...C.muted);
    doc.setFontSize(8.5);
    const introLines = doc.splitTextToSize(
      'This summary captures your personal stressor map, regulation commitment and weekly reflection from the WNAWI "Stress Less, Perform More" workshop. Keep it as a reference for your ongoing practice.',
      contentW
    );
    doc.text(introLines, margin, y);
    y += (introLines.length * 4.5) + 8;

    // ── Section heading helper ──
    const addSection = (label: string) => {
      checkPage(18);
      doc.setDrawColor(...C.terra);
      doc.setLineWidth(0.4);
      doc.line(margin, y, margin + contentW, y);
      y += 5;
      doc.setTextColor(...C.terra);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...C.dark);
    };

    // ── Field (label + value with accent) helper ──
    const addField = (label: string, value: string) => {
      const safeVal = value?.trim() || '—';
      const lines = doc.splitTextToSize(safeVal, contentW - 8);
      const blockH = lines.length * 4.8 + 10;
      checkPage(blockH);
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.setFont('helvetica', 'bold');
      doc.text(label.toUpperCase(), margin + 4, y);
      y += 4.5;
      doc.setFillColor(...C.terra);
      doc.rect(margin, y - 1, 1.8, lines.length * 4.8 + 1, 'F');
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.dark);
      doc.text(lines, margin + 5, y + 3);
      y += lines.length * 4.8 + 7;
    };

    // ── 01 Stressor Map ──
    addSection('01 — STRESSOR MAP');
    if (totalStressors === 0) {
      doc.setTextColor(...C.muted); doc.setFontSize(9); doc.text('No stressors recorded yet.', margin, y); y += 8;
    } else {
      CATEGORIES.forEach(cat => {
        const items = stressors[cat] || [];
        if (items.length === 0) return;
        checkPage(items.length * 5 + 10);
        doc.setFontSize(7.5); doc.setTextColor(...C.terra); doc.setFont('helvetica', 'bold');
        doc.text(cat.toUpperCase(), margin + 4, y); y += 5;
        doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.dark);
        items.forEach(item => { doc.text(`• ${item}`, margin + 6, y); y += 5; });
        y += 2;
      });
      if (themes.trim()) addField('Common themes I notice', themes);
    }
    y += 3;

    // ── 03 Commitment ──
    addSection('03 — MY REGULATION COMMITMENT');
    if (commitmentFields.every(f => !commitment[f]?.trim())) {
      doc.setTextColor(...C.muted); doc.setFontSize(9); doc.text('Commitment not yet completed.', margin, y); y += 8;
    } else {
      commitmentFields.forEach(f => addField(f, commitment[f] || ''));
    }
    y += 3;

    // ── 05 Reflection ──
    addSection('05 — MY REFLECTION');
    if (reflectionPrompts.every(p => !reflection[p]?.trim())) {
      doc.setTextColor(...C.muted); doc.setFontSize(9); doc.text('Reflection not yet completed.', margin, y); y += 8;
    } else {
      reflectionPrompts.forEach(p => addField(p, reflection[p] || ''));
    }
    y += 3;

    // ── Weekly Practice ──
    addSection("THIS WEEK'S PRACTICE");
    [
      { label: 'Stressor Map',  days: stressorDays },
      { label: 'Breathwork',    days: breathDays   },
      { label: 'Basic Exercise',days: exerciseDays },
    ].forEach(({ label, days }) => {
      checkPage(10);
      doc.setFontSize(9); doc.setTextColor(...C.dark); doc.setFont('helvetica', 'normal');
      doc.text(label, margin + 2, y);
      WEEK_DAYS.forEach((d, i) => {
        const filled = days.includes(d);
        doc.setFillColor(filled ? C.terra[0] : 220, filled ? C.terra[1] : 220, filled ? C.terra[2] : 220);
        doc.circle(margin + 58 + i * 9, y - 1.5, 2.2, 'F');
      });
      doc.setTextColor(...C.muted); doc.setFontSize(8);
      doc.text(`${days.length}/7`, pageW - margin, y, { align: 'right' });
      y += 8;
    });

    // ── Footer ──
    const footY = pageH - 10;
    doc.setDrawColor(...C.muted); doc.setLineWidth(0.25);
    doc.line(margin, footY - 3, pageW - margin, footY - 3);
    doc.setFontSize(7.5); doc.setTextColor(...C.muted);
    doc.text('wnawiworkshop.com', margin, footY);
    doc.text('Generated by WNAWI Workshop Companion App', pageW - margin, footY, { align: 'right' });

    doc.save('WNAWI-Workshop-Summary.pdf');
  };

  return (
    <div className="summary-page">
      {/* ── SCREEN-ONLY HEADER ── */}
      <div className="summary-screen-header">
        <Link to="/" className="back-link">← Back to Overview</Link>
        <div>
          <h2>My Workshop Summary</h2>
          <p className="page-subtitle">Print or save as PDF to keep a record</p>
        </div>
        <button className="btn-primary" onClick={generatePDF} style={{ marginTop: 0 }}>
          ⬇ Download PDF
        </button>
      </div>

      {!hasAnyData && (
        <div className="summary-empty">
          <p>No data saved yet. Complete some activities first, then come back to export your summary.</p>
          <Link to="/" className="btn-primary" style={{ marginTop: 16 }}>Go to Overview</Link>
        </div>
      )}

      {/* ── PRINTABLE DOCUMENT ── */}
      <div className="summary-doc">

        {/* Document header */}
        <div className="sdoc-header">
          <div className="sdoc-logo-block">
            <div className="sdoc-brand">WNAWI WORKSHOP</div>
            <div className="sdoc-tagline">Stress Less. Perform More.</div>
          </div>
          <div className="sdoc-meta">
            <div className="sdoc-title">My Practice Summary</div>
            <div className="sdoc-date">{today}</div>
          </div>
        </div>

        <div className="sdoc-divider" />

        {/* Intro note */}
        <p className="sdoc-intro">
          This summary captures your personal stressor map, regulation commitment and weekly reflection from the WNAWI "Stress Less, Perform More" workshop. Keep it as a reference for your ongoing practice.
        </p>

        {/* ── STRESSOR MAP ── */}
        <div className="sdoc-section">
          <div className="sdoc-section-label">01 — STRESSOR MAP</div>
          {totalStressors === 0 ? (
            <p className="sdoc-empty">No stressors recorded yet.</p>
          ) : (
            <div className="sdoc-stressor-grid">
              {CATEGORIES.map(cat => (
                (stressors[cat] || []).length > 0 && (
                  <div key={cat} className="sdoc-stressor-col">
                    <div className="sdoc-cat-label">{cat}</div>
                    <ul>
                      {stressors[cat].map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )
              ))}
            </div>
          )}
          {themes.trim() && (
            <div className="sdoc-field">
              <div className="sdoc-field-label">Common themes I notice</div>
              <div className="sdoc-field-value">{themes}</div>
            </div>
          )}
        </div>

        {/* ── COMMITMENT ── */}
        <div className="sdoc-section">
          <div className="sdoc-section-label">03 — MY REGULATION COMMITMENT</div>
          {commitmentFields.every(f => !commitment[f]?.trim()) ? (
            <p className="sdoc-empty">Commitment not yet completed.</p>
          ) : (
            commitmentFields.map(field => (
              <div key={field} className="sdoc-field">
                <div className="sdoc-field-label">{field}</div>
                <div className="sdoc-field-value">{commitment[field]?.trim() || '—'}</div>
              </div>
            ))
          )}
        </div>

        {/* ── REFLECTION ── */}
        <div className="sdoc-section">
          <div className="sdoc-section-label">05 — MY REFLECTION</div>
          {reflectionPrompts.every(p => !reflection[p]?.trim()) ? (
            <p className="sdoc-empty">Reflection not yet completed.</p>
          ) : (
            reflectionPrompts.map(prompt => (
              <div key={prompt} className="sdoc-field">
                <div className="sdoc-field-label">{prompt}</div>
                <div className="sdoc-field-value">{reflection[prompt]?.trim() || '—'}</div>
              </div>
            ))
          )}
        </div>

        {/* ── WEEKLY PRACTICE ── */}
        <div className="sdoc-section">
          <div className="sdoc-section-label">THIS WEEK'S PRACTICE</div>
          <div className="sdoc-practice-grid">
            {[
              { label: 'Stressor Map', days: stressorDays },
              { label: 'Breathwork',   days: breathDays   },
              { label: 'Basic Exercise', days: exerciseDays },
            ].map(({ label, days }) => (
              <div key={label} className="sdoc-practice-row">
                <span className="sdoc-practice-label">{label}</span>
                <div className="sdoc-day-dots">
                  {WEEK_DAYS.map(d => (
                    <span key={d} className={`sdoc-dot ${days.includes(d) ? 'filled' : ''}`} title={d} />
                  ))}
                </div>
                <span className="sdoc-practice-count">{days.length}/7 days</span>
              </div>
            ))}
          </div>
        </div>

        {/* Document footer */}
        <div className="sdoc-footer">
          <div>wnawiworkshop.com</div>
          <div>This document was generated by the WNAWI Workshop Companion app and contains your personal notes only.</div>
        </div>

      </div>

      {/* Screen-only bottom download button */}
      <div className="summary-screen-footer">
        <button className="btn-primary" onClick={generatePDF}>⬇ Download PDF</button>
        <p className="hint" style={{ marginTop: 12 }}>Saves a branded PDF directly to your device — works on mobile and desktop.</p>
      </div>
    </div>
  );
}

export default App;
