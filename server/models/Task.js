const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD' format
  isCompleted: { type: Boolean, default: false },
  color: { type: String, default: '#4caf50' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
}, { timestamps: true });

module.exports = mongoose.models.Task || mongoose.model('Task', TaskSchema);