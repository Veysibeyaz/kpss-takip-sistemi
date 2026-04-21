const mongoose = require('mongoose');

const StudySessionSchema = new mongoose.Schema({
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  minutes: { type: Number, required: true },
  sessionType: { type: String, default: 'pomodoro' }
}, { timestamps: true });

module.exports = mongoose.models.StudySession || mongoose.model('StudySession', StudySessionSchema);