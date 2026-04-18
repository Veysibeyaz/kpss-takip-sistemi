const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Modelleri içeri aktaralım
const Lesson = require('./models/Lesson');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Bağlantısı (Local)
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/kpss_takip')
  .then(() => console.log('✅ MongoDB bağlantısı başarılı!'))
  .catch((err) => console.error('❌ MongoDB bağlantı hatası:', err));

// --- API ROTalari ---

// 1. Tüm dersleri ve konuları getir
app.get('/api/lessons', async (req, res) => {
  try {
    const lessons = await Lesson.find();
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Konu durumunu güncelle (Tamamlandı/Tamamlanmadı)
app.patch('/api/lessons/:lessonId/topics/:topicId', async (req, res) => {
  try {
    const { lessonId, topicId } = req.params;
    const { isCompleted } = req.body;

    const lesson = await Lesson.findById(lessonId);
    const topic = lesson.topics.id(topicId);
    topic.isCompleted = isCompleted;
    
    await lesson.save();
    res.json(lesson);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu ${PORT} portunda çalışıyor...`);
});