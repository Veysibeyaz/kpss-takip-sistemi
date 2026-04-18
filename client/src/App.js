import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // 1. Verileri Çek
  useEffect(() => {
    fetchLessons();
  }, []);

  // 2. KPSS Geri Sayım Mantığı (Target: 6 Eylül 2026)
  useEffect(() => {
    const targetDate = new Date("September 6, 2026 10:15:00").getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        clearInterval(interval);
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchLessons = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/lessons');
      setLessons(response.data);
      if (selectedLesson) {
        const updated = response.data.find(l => l._id === selectedLesson._id);
        setSelectedLesson(updated);
      }
    } catch (error) {
      console.error("Veri çekme hatası:", error);
    }
  };

  const toggleTopic = async (lessonId, topicId, currentStatus) => {
    try {
      await axios.patch(`http://localhost:5000/api/lessons/${lessonId}/topics/${topicId}`, {
        isCompleted: !currentStatus
      });
      fetchLessons();
    } catch (error) {
      console.error("Güncelleme hatası:", error);
    }
  };

  const calculateProgress = (topics) => {
    if (!topics || topics.length === 0) return 0;
    return Math.round((topics.filter(t => t.isCompleted).length / topics.length) * 100);
  };

  // Grafik Verileri
  const totalCompleted = lessons.reduce((acc, curr) => acc + curr.topics.filter(t => t.isCompleted).length, 0);
  const totalRemaining = lessons.reduce((acc, curr) => acc + curr.topics.filter(t => !t.isCompleted).length, 0);

  const doughnutData = {
    labels: ['Biten', 'Kalan'],
    datasets: [{
      data: [totalCompleted, totalRemaining],
      backgroundColor: ['#4caf50', '#edf2f7'],
      borderWidth: 0,
    }],
  };

  // Stil Tanımlamaları
  const timerCircleStyle = (color) => ({
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    border: `5px solid ${color}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  });

  return (
    <div style={{ padding: '30px', fontFamily: '"Inter", sans-serif', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
      
      {/* ÜST PANEL: GRAFİK VE GERİ SAYIM */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px', marginBottom: '40px' }}>
        
        {/* SOL: Genel İlerleme */}
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '15px', color: '#2d3748' }}>Müfredat Tamamlanma</h3>
          <div style={{ maxHeight: '180px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <Doughnut data={doughnutData} options={{ cutout: '80%', plugins: { legend: { display: false } } }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>
              %{lessons.length > 0 ? Math.round((totalCompleted / (totalCompleted + totalRemaining)) * 100) : 0}
            </div>
          </div>
          <p style={{ marginTop: '10px', color: '#718096', fontSize: '14px' }}>Toplam {totalCompleted + totalRemaining} Konu</p>
        </div>

        {/* SAĞ: KPSS SAYACI (İstediğin Tasarım) */}
        <div style={{ backgroundColor: '#f1f1f1', padding: '25px', borderRadius: '20px', textAlign: 'center' }}>
          <h2 style={{ color: '#e53e3e', margin: '0 0 5px 0' }}>Lisans KPSS İçin Kalan Süre</h2>
          <p style={{ color: '#4a5568', fontSize: '14px', marginBottom: '25px' }}>2026 KPSS Sınav Tarihi: <strong>6 Eylül 2026 Pazar</strong></p>
          
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={timerCircleStyle("#f6ad55")}><span style={{fontSize:'22px', fontWeight:'bold'}}>{timeLeft.days}</span></div>
              <span style={{fontSize:'12px', fontWeight:'bold', marginTop:'8px', display:'block'}}>GÜN</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={timerCircleStyle("#4299e1")}><span style={{fontSize:'22px', fontWeight:'bold'}}>{timeLeft.hours}</span></div>
              <span style={{fontSize:'12px', fontWeight:'bold', marginTop:'8px', display:'block'}}>SAAT</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={timerCircleStyle("#48bb78")}><span style={{fontSize:'22px', fontWeight:'bold'}}>{timeLeft.minutes}</span></div>
              <span style={{fontSize:'12px', fontWeight:'bold', marginTop:'8px', display:'block'}}>DAKİKA</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={timerCircleStyle("#4fd1c5")}><span style={{fontSize:'22px', fontWeight:'bold'}}>{timeLeft.seconds}</span></div>
              <span style={{fontSize:'12px', fontWeight:'bold', marginTop:'8px', display:'block'}}>SANİYE</span>
            </div>
          </div>
        </div>
      </div>

      {!selectedLesson ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {lessons.map((lesson) => (
            <div key={lesson._id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, color: '#2d3748' }}>{lesson.name}</h3>
                <span style={{ color: '#1a73e8', fontWeight: 'bold' }}>%{calculateProgress(lesson.topics)}</span>
              </div>
              <div style={{ width: '100%', backgroundColor: '#edf2f7', height: '8px', borderRadius: '4px', marginBottom: '15px' }}>
                <div style={{ width: `${calculateProgress(lesson.topics)}%`, backgroundColor: '#4caf50', height: '100%', borderRadius: '4px' }}></div>
              </div>
              <button 
                onClick={() => setSelectedLesson(lesson)}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#1a73e8', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
              >
                İncele
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <button onClick={() => setSelectedLesson(null)} style={{ border: 'none', background: 'none', color: '#1a73e8', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>
            ← Geri Dön
          </button>
          <h2 style={{ marginBottom: '20px' }}>{selectedLesson.name} Konuları</h2>
          <div style={{ display: 'grid', gap: '10px' }}>
            {selectedLesson.topics.map((topic) => (
              <div key={topic._id} style={{ display: 'flex', alignItems: 'center', padding: '15px', borderRadius: '12px', border: '1px solid #edf2f7', backgroundColor: topic.isCompleted ? '#f8fafc' : 'white' }}>
                <input 
                  type="checkbox" 
                  checked={topic.isCompleted} 
                  onChange={() => toggleTopic(selectedLesson._id, topic._id, topic.isCompleted)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span style={{ marginLeft: '15px', textDecoration: topic.isCompleted ? 'line-through' : 'none', color: topic.isCompleted ? '#94a3b8' : '#2d3748' }}>
                  {topic.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;