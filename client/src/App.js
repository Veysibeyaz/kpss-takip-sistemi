import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarElement,
  Filler,
} from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement, Tooltip, Legend,
  LineElement, PointElement, LinearScale, CategoryScale,
  BarElement, Filler
);

const API = 'http://localhost:5000/api';

// ─── ALAN SINAVI DERS DAĞILIMI ───────────────────────────────
const ALAN_LESSONS = [
  { name: 'Matematik', questions: 30, color: '#6366f1' },
  { name: 'Türkçe',    questions: 30, color: '#ec4899' },
  { name: 'Tarih',     questions: 27, color: '#f59e0b' },
  { name: 'Coğrafya',  questions: 18, color: '#10b981' },
  { name: 'Vatandaşlık', questions: 9, color: '#3b82f6' },
];
const TOTAL_ALAN_QUESTIONS = ALAN_LESSONS.reduce((a, l) => a + l.questions, 0);

// ─── DATE HELPERS ────────────────────────────────────────────
const fmt = (d) => d.toISOString().split('T')[0];
const getWeekDates = (offset = 0) => {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
};
const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTH_NAMES = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

// ─── GLOBAL POMODORO STATE ────────────────────────────────────
// Stored outside component so it survives re-renders / tab switches
const pomodoroState = {
  running: false,
  phase: 'work',
  timeLeft: 25 * 60,
  modeIdx: 0,
  workedMinutes: 0,
  intervalId: null,
  listeners: new Set(),
  notify() { this.listeners.forEach(fn => fn({ ...this })); },
  start(onSessionSave) {
    if (this.running) return;
    this.running = true;
    this.notify();
    const MODES = [{ work: 25, rest: 5 }, { work: 50, rest: 10 }];
    this.intervalId = setInterval(() => {
      this.timeLeft -= 1;
      if (this.timeLeft <= 0) {
        clearInterval(this.intervalId);
        this.running = false;
        playBell();
        const mode = MODES[this.modeIdx];
        if (this.phase === 'work') {
          const worked = mode.work;
          this.workedMinutes += worked;
          onSessionSave && onSessionSave(worked);
          this.phase = 'rest';
          this.timeLeft = mode.rest * 60;
        } else {
          this.phase = 'work';
          this.timeLeft = MODES[this.modeIdx].work * 60;
        }
      }
      this.notify();
    }, 1000);
  },
  pause() {
    clearInterval(this.intervalId);
    this.running = false;
    this.notify();
  },
  reset(modeIdx) {
    clearInterval(this.intervalId);
    const MODES = [{ work: 25, rest: 5 }, { work: 50, rest: 10 }];
    this.running = false;
    this.phase = 'work';
    this.modeIdx = modeIdx !== undefined ? modeIdx : this.modeIdx;
    this.timeLeft = MODES[this.modeIdx].work * 60;
    this.notify();
  }
};

function playBell() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.5);
    // Second ring
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 660;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.4, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 1.5);
    }, 400);
  } catch(e) {}
}

// ─── THEME ──────────────────────────────────────────────────
const themes = {
  light: {
    bg: '#f0f2f8',
    surface: '#ffffff',
    surfaceAlt: '#f7f8fc',
    border: '#e4e8f0',
    text: '#1a1f36',
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',
    accent: '#6366f1',
    accentLight: '#eef2ff',
    accentHover: '#4f46e5',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    cardShadow: '0 2px 12px rgba(99,102,241,0.08)',
    navBg: '#ffffff',
    timerBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  dark: {
    bg: '#0f1117',
    surface: '#1a1d2e',
    surfaceAlt: '#22263a',
    border: '#2e3350',
    text: '#e8eaf6',
    textSecondary: '#8b92b8',
    textMuted: '#4a5175',
    accent: '#818cf8',
    accentLight: '#1e1f3a',
    accentHover: '#a5b4fc',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    cardShadow: '0 2px 16px rgba(0,0,0,0.4)',
    navBg: '#1a1d2e',
    timerBg: 'linear-gradient(135deg, #434190 0%, #553c9a 100%)',
  }
};

// ─── MAIN APP ────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('kpss-dark') === 'true');
  const [tab, setTab] = useState('dashboard');
  const t = darkMode ? themes.dark : themes.light;

  useEffect(() => {
    localStorage.setItem('kpss-dark', darkMode);
  }, [darkMode]);

  const css = {
    app: {
      minHeight: '100vh',
      backgroundColor: t.bg,
      color: t.text,
      fontFamily: '"Nunito", "Segoe UI", sans-serif',
      transition: 'background-color 0.3s, color 0.3s',
    },
    nav: {
      backgroundColor: t.navBg,
      borderBottom: `1px solid ${t.border}`,
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      height: '60px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: darkMode ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(99,102,241,0.06)',
    },
    navBrand: {
      fontWeight: 800,
      fontSize: '18px',
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginRight: '16px',
      letterSpacing: '-0.5px',
    },
    navBtn: (active) => ({
      padding: '8px 14px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: active ? 700 : 500,
      fontSize: '13px',
      backgroundColor: active ? t.accentLight : 'transparent',
      color: active ? t.accent : t.textSecondary,
      transition: 'all 0.2s',
      position: 'relative',
    }),
    content: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
    card: {
      backgroundColor: t.surface,
      borderRadius: '16px',
      padding: '24px',
      boxShadow: t.cardShadow,
      border: `1px solid ${t.border}`,
    },
  };

  const navItems = [
    { id: 'dashboard', label: '📊 Panel' },
    { id: 'syllabus', label: '📚 Müfredat' },
    { id: 'planner', label: '📅 Haftalık Plan' },
    { id: 'pomodoro', label: '⏱ Odak Timer' },
    { id: 'exams', label: '📝 Denemeler' },
  ];

  return (
    <div style={css.app}>
      <nav style={css.nav}>
        <span style={css.navBrand}>KPSS Takip</span>
        {navItems.map(item => (
          <button key={item.id} style={css.navBtn(tab === item.id)} onClick={() => setTab(item.id)}>
            {item.label}
            {item.id === 'pomodoro' && <PomodoroNavIndicator t={t} />}
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              background: darkMode ? t.accentLight : '#f1f5f9',
              border: `1px solid ${t.border}`,
              borderRadius: '10px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: '16px',
              color: t.text,
              transition: 'all 0.2s',
            }}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      <div style={css.content}>
        {tab === 'dashboard' && <Dashboard t={t} css={css} />}
        {tab === 'syllabus' && <Syllabus t={t} css={css} />}
        {tab === 'planner' && <WeeklyPlanner t={t} css={css} />}
        {tab === 'pomodoro' && <PomodoroTimer t={t} css={css} />}
        {tab === 'exams' && <ExamTracker t={t} css={css} />}
      </div>
    </div>
  );
}

// ─── POMODORO NAV INDICATOR ──────────────────────────────────
function PomodoroNavIndicator({ t }) {
  const [state, setState] = useState({ running: pomodoroState.running, phase: pomodoroState.phase });
  useEffect(() => {
    const fn = (s) => setState({ running: s.running, phase: s.phase });
    pomodoroState.listeners.add(fn);
    return () => pomodoroState.listeners.delete(fn);
  }, []);
  if (!state.running) return null;
  return (
    <span style={{
      position: 'absolute', top: '4px', right: '4px',
      width: '8px', height: '8px', borderRadius: '50%',
      backgroundColor: state.phase === 'work' ? t.accent : t.success,
      animation: 'pulse 1.5s infinite',
    }} />
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────
function Dashboard({ t, css }) {
  const [lessons, setLessons] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    axios.get(`${API}/lessons`).then(r => setLessons(r.data)).catch(() => {});
    axios.get(`${API}/study-sessions`).then(r => setSessions(r.data)).catch(() => {});
    axios.get(`${API}/exam-results`).then(r => setExamResults(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const target = new Date("September 6, 2026 10:15:00").getTime();
    const iv = setInterval(() => {
      const dist = target - Date.now();
      if (dist < 0) return clearInterval(iv);
      setTimeLeft({
        days: Math.floor(dist / 86400000),
        hours: Math.floor((dist % 86400000) / 3600000),
        minutes: Math.floor((dist % 3600000) / 60000),
        seconds: Math.floor((dist % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const totalCompleted = lessons.reduce((a, l) => a + l.topics.filter(tp => tp.isCompleted).length, 0);
  const totalTopics = lessons.reduce((a, l) => a + l.topics.length, 0);
  const progress = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;

  const week = getWeekDates(0);
  const weekLabels = week.map(d => DAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1]);
  const weekData = week.map(d => {
    const ds = fmt(d);
    return sessions.filter(s => s.date === ds).reduce((a, s) => a + s.minutes, 0) / 60;
  });

  const doughnutData = {
    labels: ['Tamamlanan', 'Kalan'],
    datasets: [{ data: [totalCompleted, totalTopics - totalCompleted], backgroundColor: ['#6366f1', t.border], borderWidth: 0 }],
  };

  const barData = {
    labels: weekLabels,
    datasets: [{
      label: 'Saat',
      data: weekData,
      backgroundColor: '#6366f1',
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  const statCard = (icon, label, value, color) => (
    <div style={{ ...css.card, display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ fontSize: '32px', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: t.accentLight, borderRadius: '12px' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '26px', fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: '13px', color: t.textSecondary, marginTop: '2px' }}>{label}</div>
      </div>
    </div>
  );

  const timerUnit = (val, label, color) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        border: `4px solid ${color}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(4px)',
      }}>
        <span style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>{String(val).padStart(2,'0')}</span>
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, marginTop: '6px', display: 'block', color: 'rgba(255,255,255,0.7)', letterSpacing: '1px' }}>{label}</span>
    </div>
  );

  const totalStudyHours = sessions.reduce((a, s) => a + s.minutes, 0) / 60;
  const lastExam = examResults.length > 0 ? examResults[examResults.length - 1] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {statCard('📚', 'Tamamlanan Konu', `${totalCompleted}/${totalTopics}`, t.accent)}
        {statCard('⏱', 'Toplam Çalışma', `${totalStudyHours.toFixed(1)}s`, t.success)}
        {statCard('📝', 'Deneme Sayısı', examResults.length, t.warning)}
        {statCard('🎯', 'Son Net', lastExam ? lastExam.net.toFixed(2) : '-', t.danger)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ ...css.card, textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 16px', color: t.text, fontSize: '16px', fontWeight: 700 }}>Müfredat İlerlemesi</h3>
          <div style={{ maxWidth: '200px', margin: '0 auto', position: 'relative' }}>
            <Doughnut data={doughnutData} options={{ cutout: '78%', plugins: { legend: { display: false } } }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: t.accent }}>%{progress}</span>
              <span style={{ fontSize: '11px', color: t.textMuted }}>Tamamlandı</span>
            </div>
          </div>
        </div>

        <div style={{ ...css.card }}>
          <h3 style={{ margin: '0 0 16px', color: t.text, fontSize: '16px', fontWeight: 700 }}>Bu Hafta Çalışma (Saat)</h3>
          <Bar data={barData} options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, grid: { color: t.border }, ticks: { color: t.textSecondary } },
              x: { grid: { display: false }, ticks: { color: t.textSecondary } }
            }
          }} />
        </div>
      </div>

      <div style={{
        ...css.card,
        background: t.timerBg,
        border: 'none',
        textAlign: 'center',
        padding: '32px 24px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '3px', marginBottom: '6px' }}>KALAN SÜRE</div>
        <h2 style={{ margin: '0 0 24px', color: '#fff', fontSize: '20px', fontWeight: 800 }}>Lisans KPSS — 6 Eylül 2026</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
          {timerUnit(timeLeft.days, 'GÜN', '#fbbf24')}
          {timerUnit(timeLeft.hours, 'SAAT', '#34d399')}
          {timerUnit(timeLeft.minutes, 'DAKİKA', '#60a5fa')}
          {timerUnit(timeLeft.seconds, 'SANİYE', '#f472b6')}
        </div>
      </div>
    </div>
  );
}

// ─── SYLLABUS ────────────────────────────────────────────────
function Syllabus({ t, css }) {
  const [lessons, setLessons] = useState([]);
  const [selected, setSelected] = useState(null);

  const fetchData = () => axios.get(`${API}/lessons`).then(r => {
    setLessons(r.data);
    if (selected) setSelected(r.data.find(l => l._id === selected._id) || null);
  }).catch(() => {});

  useEffect(() => { fetchData(); }, []);

  const toggle = async (lessonId, topicId, cur) => {
    await axios.patch(`${API}/lessons/${lessonId}/topics/${topicId}`, { isCompleted: !cur });
    fetchData();
  };

  const progress = (topics) => !topics?.length ? 0 : Math.round(topics.filter(tp => tp.isCompleted).length / topics.length * 100);
  const LESSON_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6'];

  if (selected) return (
    <div>
      <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: t.accent, cursor: 'pointer', fontWeight: 700, fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        ← Geri Dön
      </button>
      <div style={css.card}>
        <h2 style={{ margin: '0 0 20px', color: t.text }}>{selected.name}</h2>
        <div style={{ display: 'grid', gap: '10px' }}>
          {selected.topics.map(topic => (
            <div key={topic._id} onClick={() => toggle(selected._id, topic._id, topic.isCompleted)}
              style={{
                display: 'flex', alignItems: 'center', padding: '14px 16px',
                borderRadius: '12px', border: `1px solid ${topic.isCompleted ? t.success + '40' : t.border}`,
                backgroundColor: topic.isCompleted ? t.success + '10' : t.surface,
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '6px',
                border: `2px solid ${topic.isCompleted ? t.success : t.border}`,
                backgroundColor: topic.isCompleted ? t.success : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {topic.isCompleted && <span style={{ color: '#fff', fontSize: '13px' }}>✓</span>}
              </div>
              <span style={{ marginLeft: '12px', color: topic.isCompleted ? t.textMuted : t.text, textDecoration: topic.isCompleted ? 'line-through' : 'none', fontSize: '15px' }}>
                {topic.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
      {lessons.map((lesson, i) => {
        const pct = progress(lesson.topics);
        const color = LESSON_COLORS[i % LESSON_COLORS.length];
        return (
          <div key={lesson._id} style={{ ...css.card, cursor: 'pointer' }} onClick={() => setSelected(lesson)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', fontSize: '20px' }}>
                  📖
                </div>
                <h3 style={{ margin: 0, color: t.text, fontSize: '16px', fontWeight: 700 }}>{lesson.name}</h3>
              </div>
              <span style={{ fontWeight: 800, fontSize: '20px', color }}>{pct}%</span>
            </div>
            <div style={{ height: '6px', backgroundColor: t.border, borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '3px', transition: 'width 0.5s' }} />
            </div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: t.textSecondary }}>
              {lesson.topics.filter(tp => tp.isCompleted).length} / {lesson.topics.length} konu tamamlandı
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── WEEKLY PLANNER ──────────────────────────────────────────
function WeeklyPlanner({ t, css }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [addingDay, setAddingDay] = useState(null);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', color: '#6366f1' });

  const week = getWeekDates(weekOffset);

  const fetchTasks = useCallback(() => {
    const start = fmt(week[0]);
    const end = fmt(week[6]);
    axios.get(`${API}/tasks?weekStart=${start}&weekEnd=${end}`).then(r => setTasks(r.data)).catch(() => {});
  }, [weekOffset]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async (date) => {
    if (!newTask.title.trim()) return;
    await axios.post(`${API}/tasks`, { ...newTask, date });
    setNewTask({ title: '', priority: 'medium', color: '#6366f1' });
    setAddingDay(null);
    fetchTasks();
  };

  const toggleTask = async (id, cur) => {
    await axios.patch(`${API}/tasks/${id}`, { isCompleted: !cur });
    fetchTasks();
  };

  const deleteTask = async (id) => {
    await axios.delete(`${API}/tasks/${id}`);
    fetchTasks();
  };

  const today = fmt(new Date());
  const rangeLabel = `${week[0].getDate()} ${MONTH_NAMES[week[0].getMonth()]} — ${week[6].getDate()} ${MONTH_NAMES[week[6].getMonth()]}`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={{ ...btnStyle(t), padding: '8px 12px' }}>‹</button>
        <h3 style={{ margin: 0, color: t.text, fontWeight: 700, fontSize: '16px', flex: 1, textAlign: 'center' }}>{rangeLabel}</h3>
        <button onClick={() => setWeekOffset(w => w + 1)} style={{ ...btnStyle(t), padding: '8px 12px' }}>›</button>
        <button onClick={() => setWeekOffset(0)} style={{ ...btnStyle(t), fontSize: '13px' }}>Bugün</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
        {week.map((date, i) => {
          const ds = fmt(date);
          const dayTasks = tasks.filter(task => task.date === ds);
          const isToday = ds === today;
          return (
            <div key={ds} style={{
              ...css.card, padding: '12px',
              border: `2px solid ${isToday ? t.accent : t.border}`,
              backgroundColor: isToday ? t.accentLight : t.surface,
              minHeight: '140px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: isToday ? t.accent : t.textMuted, letterSpacing: '1px' }}>{DAY_NAMES[i]}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: isToday ? t.accent : t.text }}>{date.getDate()}</div>
                </div>
                <button onClick={() => setAddingDay(addingDay === ds ? null : ds)} style={{
                  width: '24px', height: '24px', borderRadius: '6px', border: 'none',
                  backgroundColor: t.accent, color: '#fff', cursor: 'pointer', fontSize: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>+</button>
              </div>

              {dayTasks.map(task => (
                <div key={task._id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '6px',
                  padding: '6px 8px', borderRadius: '8px', marginBottom: '4px',
                  backgroundColor: task.color + '18', borderLeft: `3px solid ${task.color}`,
                }}>
                  <input type="checkbox" checked={task.isCompleted} onChange={() => toggleTask(task._id, task.isCompleted)}
                    style={{ marginTop: '2px', cursor: 'pointer', accentColor: task.color }} />
                  <span style={{ fontSize: '12px', color: task.isCompleted ? t.textMuted : t.text, textDecoration: task.isCompleted ? 'line-through' : 'none', flex: 1, lineHeight: 1.3 }}>
                    {task.title}
                  </span>
                  <button onClick={() => deleteTask(task._id)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '12px', padding: '0' }}>×</button>
                </div>
              ))}

              {addingDay === ds && (
                <div style={{ marginTop: '8px' }}>
                  <input autoFocus value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addTask(ds)} placeholder="Görev ekle..."
                    style={{ ...inputStyle(t), fontSize: '12px', padding: '6px 8px', marginBottom: '6px' }} />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6'].map(c => (
                      <div key={c} onClick={() => setNewTask(p => ({ ...p, color: c }))}
                        style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: c, cursor: 'pointer', border: newTask.color === c ? `2px solid ${t.text}` : '2px solid transparent' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    <button onClick={() => addTask(ds)} style={{ ...btnStyle(t, true), fontSize: '11px', padding: '4px 8px' }}>Ekle</button>
                    <button onClick={() => setAddingDay(null)} style={{ ...btnStyle(t), fontSize: '11px', padding: '4px 8px' }}>İptal</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── POMODORO TIMER (global state, persists across tabs) ─────
function PomodoroTimer({ t, css }) {
  const MODES = [
    { label: '25/5 Klasik', work: 25, rest: 5 },
    { label: '50/10 Derin', work: 50, rest: 10 },
  ];
  const [state, setState] = useState({
    running: pomodoroState.running,
    phase: pomodoroState.phase,
    timeLeft: pomodoroState.timeLeft,
    modeIdx: pomodoroState.modeIdx,
  });
  const [sessions, setSessions] = useState([]);
  const [todayMinutes, setTodayMinutes] = useState(0);

  useEffect(() => {
    const fn = (s) => setState({ running: s.running, phase: s.phase, timeLeft: s.timeLeft, modeIdx: s.modeIdx });
    pomodoroState.listeners.add(fn);
    return () => pomodoroState.listeners.delete(fn);
  }, []);

  const fetchSessions = useCallback(() => {
    axios.get(`${API}/study-sessions`).then(r => {
      setSessions(r.data);
      const today = fmt(new Date());
      setTodayMinutes(r.data.filter(s => s.date === today).reduce((a, s) => a + s.minutes, 0));
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleStart = () => {
    pomodoroState.start((minutes) => {
      const today = fmt(new Date());
      axios.post(`${API}/study-sessions`, { date: today, minutes }).then(() => fetchSessions());
    });
  };

  const handleModeChange = (idx) => {
    pomodoroState.reset(idx);
  };

  const mins = Math.floor(state.timeLeft / 60);
  const secs = state.timeLeft % 60;
  const mode = MODES[state.modeIdx];
  const total = state.phase === 'work' ? mode.work * 60 : mode.rest * 60;
  const pct = ((total - state.timeLeft) / total) * 100;

  const week = getWeekDates(0);
  const weekData = week.map(d => {
    const ds = fmt(d);
    return sessions.filter(s => s.date === ds).reduce((a, s) => a + s.minutes, 0) / 60;
  });

  const circumference = 2 * Math.PI * 90;
  const strokeDash = circumference - (pct / 100) * circumference;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
      <div style={{ ...css.card, textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
          {MODES.map((m, i) => (
            <button key={i} onClick={() => handleModeChange(i)} style={{ ...btnStyle(t, state.modeIdx === i), fontSize: '13px' }}>
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto 24px' }}>
          <svg width="220" height="220" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="110" cy="110" r="90" fill="none" stroke={t.border} strokeWidth="10" />
            <circle cx="110" cy="110" r="90" fill="none"
              stroke={state.phase === 'work' ? t.accent : t.success}
              strokeWidth="10" strokeDasharray={circumference}
              strokeDashoffset={strokeDash} strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: state.phase === 'work' ? t.accent : t.success, letterSpacing: '2px', marginBottom: '4px' }}>
              {state.phase === 'work' ? '🎯 ODAK' : '☕ MOLA'}
            </div>
            <div style={{ fontSize: '48px', fontWeight: 800, color: t.text, letterSpacing: '-2px', fontVariantNumeric: 'tabular-nums' }}>
              {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={state.running ? () => pomodoroState.pause() : handleStart} style={{
            padding: '14px 36px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            backgroundColor: t.accent, color: '#fff', fontSize: '16px', fontWeight: 700,
            boxShadow: `0 4px 14px ${t.accent}50`,
          }}>
            {state.running ? '⏸ Durdur' : '▶ Başlat'}
          </button>
          <button onClick={() => pomodoroState.reset()} style={{ ...btnStyle(t), padding: '14px 20px', fontSize: '14px' }}>
            ↺
          </button>
        </div>

        <div style={{ marginTop: '20px', padding: '12px', borderRadius: '10px', backgroundColor: t.accentLight, textAlign: 'center' }}>
          <span style={{ fontSize: '13px', color: t.textSecondary }}>Bugün: </span>
          <span style={{ fontWeight: 800, color: t.accent }}>{Math.floor(todayMinutes / 60)}s {todayMinutes % 60}dk</span>
        </div>
      </div>

      <div style={{ ...css.card }}>
        <h3 style={{ margin: '0 0 20px', color: t.text, fontSize: '16px', fontWeight: 700 }}>Haftalık Çalışma Süresi</h3>
        <Bar
          data={{
            labels: DAY_NAMES,
            datasets: [{
              label: 'Saat',
              data: weekData,
              backgroundColor: weekData.map((_, i) => i === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1) ? t.accent : t.accent + '60'),
              borderRadius: 8, borderSkipped: false,
            }]
          }}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, grid: { color: t.border }, ticks: { color: t.textSecondary } },
              x: { grid: { display: false }, ticks: { color: t.textSecondary } }
            }
          }}
        />
        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: t.surfaceAlt, textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: t.accent }}>
              {(sessions.reduce((a, s) => a + s.minutes, 0) / 60).toFixed(1)}
            </div>
            <div style={{ fontSize: '12px', color: t.textSecondary }}>Toplam Saat</div>
          </div>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: t.surfaceAlt, textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: t.success }}>
              {sessions.length}
            </div>
            <div style={{ fontSize: '12px', color: t.textSecondary }}>Toplam Seans</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EXAM TRACKER ────────────────────────────────────────────
function ExamTracker({ t, css }) {
  const [examType, setExamType] = useState('genel');
  const [results, setResults] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null); // for alan lesson detail

  // Form state
  const emptyLessonScores = () => ALAN_LESSONS.reduce((a, l) => ({ ...a, [l.name]: { correct: '', wrong: '' } }), {});
  const [form, setForm] = useState({
    date: fmt(new Date()),
    examName: '',
    // genel
    correct: '', wrong: '', empty: '', totalQuestions: 120,
    // alan
    lessonScores: emptyLessonScores(),
    // hata günlüğü
    errorTopics: {},
  });

  // Error log: per lesson, list of topics
  const [alanLessonsData, setAlanLessonsData] = useState([]); // from API
  useEffect(() => {
    axios.get(`${API}/lessons`).then(r => setAlanLessonsData(r.data)).catch(() => {});
  }, []);

  const fetchResults = useCallback(() => {
    axios.get(`${API}/exam-results?examType=${examType}`).then(r => setResults(r.data)).catch(() => {});
  }, [examType]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const calcAlanNet = (scores) => {
    return ALAN_LESSONS.reduce((total, l) => {
      const c = Number(scores[l.name]?.correct || 0);
      const w = Number(scores[l.name]?.wrong || 0);
      return total + (c - w / 4);
    }, 0);
  };

  const calcAlanTotals = (scores) => {
    let c = 0, w = 0;
    ALAN_LESSONS.forEach(l => {
      c += Number(scores[l.name]?.correct || 0);
      w += Number(scores[l.name]?.wrong || 0);
    });
    return { correct: c, wrong: w, empty: TOTAL_ALAN_QUESTIONS - c - w };
  };

  const submit = async () => {
    let payload;
    if (examType === 'genel') {
      const c = Number(form.correct), w = Number(form.wrong);
      payload = {
        date: form.date, examType, examName: form.examName,
        correct: c, wrong: w, empty: Number(form.empty),
        net: c - w / 4, totalQuestions: Number(form.totalQuestions),
        lessonScores: {}, errorTopics: form.errorTopics,
      };
    } else {
      const net = calcAlanNet(form.lessonScores);
      const totals = calcAlanTotals(form.lessonScores);
      payload = {
        date: form.date, examType, examName: form.examName,
        correct: totals.correct, wrong: totals.wrong, empty: totals.empty,
        net, totalQuestions: TOTAL_ALAN_QUESTIONS,
        lessonScores: form.lessonScores,
        errorTopics: form.errorTopics,
      };
    }
    await axios.post(`${API}/exam-results`, payload);
    setShowForm(false);
    setForm({ date: fmt(new Date()), examName: '', correct: '', wrong: '', empty: '', totalQuestions: 120, lessonScores: emptyLessonScores(), errorTopics: {} });
    fetchResults();
  };

  const deleteResult = async (id) => {
    await axios.delete(`${API}/exam-results/${id}`);
    fetchResults();
  };

  const sorted = [...results].sort((a, b) => a.date.localeCompare(b.date));
  const best = results.length ? Math.max(...results.map(r => r.net)) : 0;
  const avg = results.length ? results.reduce((a, r) => a + r.net, 0) / results.length : 0;
  const last = results.length ? results[results.length - 1].net : 0;

  // Ders bazlı istatistik (sadece alan için)
  const getLessonStats = (lessonName) => {
    const filtered = results.filter(r => r.lessonScores && r.lessonScores[lessonName]);
    if (!filtered.length) return { avg: 0, best: 0, last: 0, count: filtered.length };
    const nets = filtered.map(r => {
      const c = Number(r.lessonScores[lessonName]?.correct || 0);
      const w = Number(r.lessonScores[lessonName]?.wrong || 0);
      return c - w / 4;
    });
    return {
      avg: nets.reduce((a, n) => a + n, 0) / nets.length,
      best: Math.max(...nets),
      last: nets[nets.length - 1],
      count: filtered.length,
      nets,
      dates: filtered.map(r => r.examName || r.date),
    };
  };

  // Hata analizi: tüm denemeler için
  const getAllErrorTopics = () => {
    const map = {};
    results.forEach(r => {
      if (!r.errorTopics) return;
      Object.entries(r.errorTopics).forEach(([lesson, topics]) => {
        topics.forEach(topic => {
          const key = `${lesson} — ${topic}`;
          map[key] = (map[key] || 0) + 1;
        });
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const errorTopicsList = getAllErrorTopics();

  // Alan ders detay view
  if (selectedLesson && examType === 'alan') {
    const stats = getLessonStats(selectedLesson.name);
    const lessonResults = results.filter(r => r.lessonScores && r.lessonScores[selectedLesson.name]);
    const lineData = {
      labels: stats.dates || [],
      datasets: [{
        label: 'Net',
        data: stats.nets || [],
        borderColor: selectedLesson.color,
        backgroundColor: selectedLesson.color + '20',
        fill: true, tension: 0.4, pointRadius: 5,
        pointBackgroundColor: selectedLesson.color,
        pointBorderColor: t.surface, pointBorderWidth: 2,
      }]
    };
    return (
      <div>
        <button onClick={() => setSelectedLesson(null)} style={{ background: 'none', border: 'none', color: t.accent, cursor: 'pointer', fontWeight: 700, fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Geri Dön
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ ...css.card }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: selectedLesson.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📘</div>
              <div>
                <h2 style={{ margin: 0, color: t.text }}>{selectedLesson.name}</h2>
                <span style={{ fontSize: '13px', color: t.textSecondary }}>{selectedLesson.questions} soru • {stats.count} deneme</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
              {[
                { label: 'Ortalama Net', value: stats.avg.toFixed(2), color: t.accent, icon: '📊' },
                { label: 'En İyi Net',   value: stats.best.toFixed(2), color: t.warning, icon: '🏆' },
                { label: 'Son Net',      value: stats.last.toFixed(2), color: t.success, icon: '🎯' },
              ].map(s => (
                <div key={s.label} style={{ padding: '16px', borderRadius: '12px', backgroundColor: t.surfaceAlt, textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: t.textSecondary }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {stats.nets?.length > 1 && (
            <div style={css.card}>
              <h3 style={{ margin: '0 0 16px', color: t.text, fontSize: '16px', fontWeight: 700 }}>Net Gelişim</h3>
              <Line data={lineData} options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  y: { grid: { color: t.border }, ticks: { color: t.textSecondary } },
                  x: { grid: { display: false }, ticks: { color: t.textSecondary } },
                }
              }} />
            </div>
          )}

          <div style={css.card}>
            <h3 style={{ margin: '0 0 16px', color: t.text, fontSize: '16px', fontWeight: 700 }}>Deneme Detayları</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr>
                  {['Tarih','Deneme','Doğru','Yanlış','Net'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: t.textSecondary, fontSize: '12px', fontWeight: 700, borderBottom: `1px solid ${t.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...lessonResults].reverse().map(r => {
                  const c = Number(r.lessonScores[selectedLesson.name]?.correct || 0);
                  const w = Number(r.lessonScores[selectedLesson.name]?.wrong || 0);
                  const net = c - w / 4;
                  return (
                    <tr key={r._id} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ padding: '12px', color: t.textSecondary, fontSize: '13px' }}>{r.date}</td>
                      <td style={{ padding: '12px', color: t.text, fontWeight: 600 }}>{r.examName || '-'}</td>
                      <td style={{ padding: '12px', color: t.success, fontWeight: 700 }}>{c}</td>
                      <td style={{ padding: '12px', color: t.danger, fontWeight: 700 }}>{w}</td>
                      <td style={{ padding: '12px', color: selectedLesson.color, fontWeight: 800, fontSize: '16px' }}>{net.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Tabs + Add */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {['genel', 'alan'].map(type => (
          <button key={type} onClick={() => setExamType(type)} style={{ ...btnStyle(t, examType === type), fontSize: '14px' }}>
            {type === 'genel' ? '🎓 Genel Yetenek/Kültür' : '📐 Alan Bilgisi'}
          </button>
        ))}
        <button onClick={() => setShowForm(s => !s)} style={{ marginLeft: 'auto', ...btnStyle(t, true), fontSize: '14px' }}>
          + Deneme Ekle
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
        {[
          { label: 'En Yüksek Net', value: best.toFixed(2), icon: '🏆', color: t.warning },
          { label: 'Ortalama Net',  value: avg.toFixed(2),  icon: '📊', color: t.accent },
          { label: 'Son Net',       value: last.toFixed(2), icon: '🎯', color: t.success },
        ].map(s => (
          <div key={s.label} style={{ ...css.card, textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>{s.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '13px', color: t.textSecondary }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ALAN: Ders Bazlı Kartlar */}
      {examType === 'alan' && results.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 16px', color: t.text, fontSize: '16px', fontWeight: 700 }}>📘 Ders Bazlı Analiz</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
            {ALAN_LESSONS.map(lesson => {
              const stats = getLessonStats(lesson.name);
              const maxNet = lesson.questions;
              const pct = maxNet > 0 ? Math.min(100, (stats.avg / maxNet) * 100) : 0;
              return (
                <div key={lesson.name}
                  onClick={() => setSelectedLesson(lesson)}
                  style={{
                    ...css.card, cursor: 'pointer', padding: '18px',
                    border: `1px solid ${lesson.color}30`,
                    transition: 'transform 0.18s, box-shadow 0.18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${lesson.color}25`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = t.cardShadow; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: lesson.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📘</div>
                    <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 600 }}>{lesson.questions} soru</span>
                  </div>
                  <div style={{ fontWeight: 700, color: t.text, fontSize: '15px', marginBottom: '4px' }}>{lesson.name}</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: lesson.color, marginBottom: '8px' }}>
                    {stats.count > 0 ? stats.avg.toFixed(2) : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: t.textSecondary, marginBottom: '8px' }}>Ort. Net {stats.count > 0 ? `• ${stats.count} deneme` : '• Henüz deneme yok'}</div>
                  <div style={{ height: '5px', backgroundColor: t.border, borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: lesson.color, borderRadius: '3px', transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <div style={{ ...css.card }}>
          <h3 style={{ margin: '0 0 16px', color: t.text }}>
            {examType === 'genel' ? 'Genel Yetenek/Kültür Denemesi' : 'Alan Bilgisi Denemesi'} Ekle
          </h3>

          {/* Common fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle(t)}>Tarih</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={inputStyle(t)} />
            </div>
            <div>
              <label style={labelStyle(t)}>Deneme Adı</label>
              <input placeholder="ör: İSEM Deneme 1" value={form.examName} onChange={e => setForm(p => ({ ...p, examName: e.target.value }))} style={inputStyle(t)} />
            </div>
          </div>

          {examType === 'genel' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: '12px' }}>
              <div>
                <label style={labelStyle(t)}>Doğru</label>
                <input type="number" placeholder="0" value={form.correct} onChange={e => setForm(p => ({ ...p, correct: e.target.value }))} style={inputStyle(t)} />
              </div>
              <div>
                <label style={labelStyle(t)}>Yanlış</label>
                <input type="number" placeholder="0" value={form.wrong} onChange={e => setForm(p => ({ ...p, wrong: e.target.value }))} style={inputStyle(t)} />
              </div>
              <div>
                <label style={labelStyle(t)}>Boş</label>
                <input type="number" placeholder="0" value={form.empty} onChange={e => setForm(p => ({ ...p, empty: e.target.value }))} style={inputStyle(t)} />
              </div>
              <div>
                <label style={labelStyle(t)}>Toplam Soru</label>
                <input type="number" value={form.totalQuestions} onChange={e => setForm(p => ({ ...p, totalQuestions: e.target.value }))} style={inputStyle(t)} />
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '12px', color: t.textSecondary, fontSize: '13px', fontWeight: 600 }}>Derse Göre Doğru / Yanlış Girin</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {ALAN_LESSONS.map(lesson => {
                  const c = Number(form.lessonScores[lesson.name]?.correct || 0);
                  const w = Number(form.lessonScores[lesson.name]?.wrong || 0);
                  const net = c - w / 4;
                  return (
                    <div key={lesson.name} style={{
                      display: 'grid', gridTemplateColumns: '140px 1fr 1fr auto',
                      alignItems: 'center', gap: '10px', padding: '10px 14px',
                      borderRadius: '10px', backgroundColor: t.surfaceAlt,
                      borderLeft: `4px solid ${lesson.color}`,
                    }}>
                      <span style={{ fontWeight: 700, color: t.text, fontSize: '14px' }}>{lesson.name}</span>
                      <div>
                        <label style={{ ...labelStyle(t), marginBottom: '3px' }}>Doğru / {lesson.questions}</label>
                        <input type="number" min="0" max={lesson.questions} placeholder="0"
                          value={form.lessonScores[lesson.name]?.correct || ''}
                          onChange={e => setForm(p => ({ ...p, lessonScores: { ...p.lessonScores, [lesson.name]: { ...p.lessonScores[lesson.name], correct: e.target.value } } }))}
                          style={{ ...inputStyle(t), padding: '6px 10px' }}
                        />
                      </div>
                      <div>
                        <label style={{ ...labelStyle(t), marginBottom: '3px' }}>Yanlış</label>
                        <input type="number" min="0" max={lesson.questions} placeholder="0"
                          value={form.lessonScores[lesson.name]?.wrong || ''}
                          onChange={e => setForm(p => ({ ...p, lessonScores: { ...p.lessonScores, [lesson.name]: { ...p.lessonScores[lesson.name], wrong: e.target.value } } }))}
                          style={{ ...inputStyle(t), padding: '6px 10px' }}
                        />
                      </div>
                      <div style={{ textAlign: 'center', minWidth: '50px' }}>
                        <div style={{ fontSize: '11px', color: t.textMuted, marginBottom: '2px' }}>Net</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: lesson.color }}>{net.toFixed(1)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Total preview */}
              <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '10px', backgroundColor: t.accentLight, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: t.textSecondary, fontSize: '13px', fontWeight: 600 }}>Toplam Net:</span>
                <span style={{ fontWeight: 800, fontSize: '20px', color: t.accent }}>{calcAlanNet(form.lessonScores).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Hata Günlüğü */}
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 10px', color: t.text, fontSize: '14px', fontWeight: 700 }}>📌 Hata Günlüğü — Yanlış Yapılan Konular</h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              {(examType === 'alan' ? ALAN_LESSONS : [{ name: 'Genel', color: t.accent }]).map(lesson => {
                const lessonTopics = examType === 'alan'
                  ? (alanLessonsData.find(l => l.name === lesson.name)?.topics || [])
                  : [];
                const selected = form.errorTopics[lesson.name] || [];
                return (
                  <div key={lesson.name} style={{ padding: '12px', borderRadius: '10px', backgroundColor: t.surfaceAlt, borderLeft: `4px solid ${lesson.color || t.accent}` }}>
                    <div style={{ fontWeight: 700, color: t.text, fontSize: '13px', marginBottom: '8px' }}>{lesson.name}</div>
                    {examType === 'alan' && lessonTopics.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {lessonTopics.map(topic => {
                          const isSelected = selected.includes(topic.title);
                          return (
                            <button key={topic._id}
                              onClick={() => {
                                const next = isSelected
                                  ? selected.filter(t => t !== topic.title)
                                  : [...selected, topic.title];
                                setForm(p => ({ ...p, errorTopics: { ...p.errorTopics, [lesson.name]: next } }));
                              }}
                              style={{
                                padding: '4px 10px', borderRadius: '20px', border: `1px solid ${isSelected ? lesson.color : t.border}`,
                                backgroundColor: isSelected ? lesson.color + '25' : 'transparent',
                                color: isSelected ? lesson.color : t.textSecondary,
                                cursor: 'pointer', fontSize: '12px', fontWeight: isSelected ? 700 : 400,
                                transition: 'all 0.15s',
                              }}>
                              {topic.title}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        placeholder="Konu adı yazın, Enter ile ekle..."
                        onKeyDown={e => {
                          if (e.key === 'Enter' && e.target.value.trim()) {
                            const val = e.target.value.trim();
                            const next = [...selected, val];
                            setForm(p => ({ ...p, errorTopics: { ...p.errorTopics, [lesson.name]: next } }));
                            e.target.value = '';
                          }
                        }}
                        style={{ ...inputStyle(t), fontSize: '13px', padding: '7px 10px', marginBottom: '6px' }}
                      />
                    )}
                    {selected.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                        {selected.map(tp => (
                          <span key={tp} style={{ padding: '3px 10px', borderRadius: '20px', backgroundColor: t.danger + '20', color: t.danger, fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {tp}
                            <button onClick={() => {
                              const next = selected.filter(x => x !== tp);
                              setForm(p => ({ ...p, errorTopics: { ...p.errorTopics, [lesson.name]: next } }));
                            }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.danger, padding: 0, fontSize: '13px', lineHeight: 1 }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={submit} style={{ ...btnStyle(t, true), fontSize: '14px' }}>Kaydet</button>
            <button onClick={() => setShowForm(false)} style={{ ...btnStyle(t), fontSize: '14px' }}>İptal</button>
          </div>
        </div>
      )}

      {/* Chart */}
      {sorted.length > 1 && (
        <div style={css.card}>
          <h3 style={{ margin: '0 0 16px', color: t.text, fontSize: '16px', fontWeight: 700 }}>Net Gelişim Grafiği</h3>
          <Line data={{
            labels: sorted.map(r => r.examName || r.date),
            datasets: [{
              label: 'Net',
              data: sorted.map(r => r.net),
              borderColor: t.accent,
              backgroundColor: t.accent + '20',
              fill: true, tension: 0.4, pointRadius: 5,
              pointBackgroundColor: t.accent,
              pointBorderColor: t.surface, pointBorderWidth: 2,
            }]
          }} options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              y: { grid: { color: t.border }, ticks: { color: t.textSecondary } },
              x: { grid: { display: false }, ticks: { color: t.textSecondary } },
            }
          }} />
        </div>
      )}

      {/* Hata Analizi */}
      {errorTopicsList.length > 0 && (
        <div style={css.card}>
          <h3 style={{ margin: '0 0 16px', color: t.text, fontSize: '16px', fontWeight: 700 }}>🔴 En Çok Hata Yapılan Konular</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {errorTopicsList.slice(0, 10).map(([topic, count], idx) => {
              const maxCount = errorTopicsList[0][1];
              const pct = (count / maxCount) * 100;
              const colors = ['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e'];
              const color = colors[Math.min(idx, colors.length - 1)];
              return (
                <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: t.textMuted, minWidth: '20px', textAlign: 'right' }}>#{idx+1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: t.text, fontWeight: 600 }}>{topic}</span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color }}>{count} hata</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: t.border, borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '3px', transition: 'width 0.5s' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      {results.length > 0 && (
        <div style={css.card}>
          <h3 style={{ margin: '0 0 16px', color: t.text, fontSize: '16px', fontWeight: 700 }}>Tüm Sonuçlar</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr>
                  {['Tarih','Deneme','Doğru','Yanlış','Boş','Net'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: t.textSecondary, fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', borderBottom: `1px solid ${t.border}` }}>{h}</th>
                  ))}
                  <th style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}` }} />
                </tr>
              </thead>
              <tbody>
                {[...results].reverse().map(r => (
                  <tr key={r._id} style={{ borderBottom: `1px solid ${t.border}` }}>
                    <td style={{ padding: '12px', color: t.textSecondary, fontSize: '13px' }}>{r.date}</td>
                    <td style={{ padding: '12px', color: t.text, fontWeight: 600 }}>{r.examName || '-'}</td>
                    <td style={{ padding: '12px', color: t.success, fontWeight: 700 }}>{r.correct}</td>
                    <td style={{ padding: '12px', color: t.danger, fontWeight: 700 }}>{r.wrong}</td>
                    <td style={{ padding: '12px', color: t.textSecondary }}>{r.empty}</td>
                    <td style={{ padding: '12px', color: t.accent, fontWeight: 800, fontSize: '16px' }}>{r.net.toFixed(2)}</td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => deleteResult(r._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: '16px' }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results.length === 0 && !showForm && (
        <div style={{ ...css.card, textAlign: 'center', padding: '48px', color: t.textSecondary }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
          <p>Henüz deneme eklenmedi. İlk denemenizi ekleyin!</p>
        </div>
      )}
    </div>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────
const btnStyle = (t, active = false) => ({
  padding: '10px 18px', borderRadius: '10px',
  border: `1px solid ${active ? t.accent : t.border}`,
  cursor: 'pointer', fontWeight: active ? 700 : 500, fontSize: '13px',
  backgroundColor: active ? t.accent : t.surface,
  color: active ? '#fff' : t.textSecondary,
  transition: 'all 0.2s',
});

const inputStyle = (t) => ({
  width: '100%', padding: '10px 12px', borderRadius: '10px',
  border: `1px solid ${t.border}`, backgroundColor: t.surfaceAlt,
  color: t.text, fontSize: '14px', outline: 'none',
  boxSizing: 'border-box',
});

const labelStyle = (t) => ({
  display: 'block', fontSize: '12px', fontWeight: 700,
  color: t.textSecondary, marginBottom: '6px', letterSpacing: '0.5px',
});