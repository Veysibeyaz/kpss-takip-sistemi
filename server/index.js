const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const Lesson = require('./models/Lesson');
const Task = require('./models/Task');
const StudySession = require('./models/StudySession');
const ExamResult = require('./models/ExamResult');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/kpss_takip')
  .then(() => console.log('✅ MongoDB bağlantısı başarılı!'))
  .catch((err) => console.error('❌ MongoDB bağlantı hatası:', err));

// ─── LESSONS ───────────────────────────────────────────────
app.get('/api/lessons', async (req, res) => {
  try {
    const lessons = await Lesson.find();
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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

// ─── TASKS (Weekly Planner) ─────────────────────────────────
app.get('/api/tasks', async (req, res) => {
  try {
    const { weekStart, weekEnd } = req.query;
    const query = {};
    if (weekStart && weekEnd) {
      query.date = { $gte: weekStart, $lte: weekEnd };
    }
    const tasks = await Task.find(query).sort({ createdAt: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const task = new Task(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Görev silindi' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── STUDY SESSIONS (Pomodoro) ──────────────────────────────
app.get('/api/study-sessions', async (req, res) => {
  try {
    const sessions = await StudySession.find().sort({ date: 1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/study-sessions', async (req, res) => {
  try {
    const session = new StudySession(req.body);
    await session.save();
    res.status(201).json(session);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── EXAM RESULTS ───────────────────────────────────────────
app.get('/api/exam-results', async (req, res) => {
  try {
    const { examType } = req.query;
    const query = examType ? { examType } : {};
    const results = await ExamResult.find(query).sort({ date: 1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/exam-results', async (req, res) => {
  try {
    const result = new ExamResult(req.body);
    await result.save();
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/exam-results/:id', async (req, res) => {
  try {
    await ExamResult.findByIdAndDelete(req.params.id);
    res.json({ message: 'Sonuç silindi' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu ${PORT} portunda çalışıyor...`);
});