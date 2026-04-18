const mongoose = require('mongoose');

const TopicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  isCompleted: { type: Boolean, default: false }
});

const LessonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  topics: [TopicSchema]
});

// Eğer model zaten tanımlanmışsa onu kullan, tanımlanmamışsa yeni oluştur.
// Bu yöntem, özellikle "HMR" veya "Seed" gibi işlemlerde çakışmaları ve 'not a function' hatalarını önler.
module.exports = mongoose.models.Lesson || mongoose.model('Lesson', LessonSchema);