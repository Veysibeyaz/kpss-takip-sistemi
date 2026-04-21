const mongoose = require('mongoose');

const ExamResultSchema = new mongoose.Schema({
  date: { type: String, required: true },
  examType: { type: String, enum: ['alan', 'genel'], required: true },
  examName: { type: String, default: '' },
  correct: { type: Number, required: true },
  wrong: { type: Number, required: true },
  empty: { type: Number, default: 0 },
  net: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  // Alan sınavı için ders bazlı skorlar
  // { "Matematik": { correct: 20, wrong: 5 }, "Türkçe": {...}, ... }
  lessonScores: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Hata günlüğü: { "Matematik": ["Olasılık", "Kümeler"], ... }
  errorTopics: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.models.ExamResult || mongoose.model('ExamResult', ExamResultSchema);