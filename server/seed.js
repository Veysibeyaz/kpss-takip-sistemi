const mongoose = require('mongoose');
const Lesson = require('./models/Lesson');
const dotenv = require('dotenv');

dotenv.config();

// 1. Veri setini en üstte tanımlıyoruz
const kpssData = [
  {
    name: "Türkçe",
    topics: [
      { title: "Ses Bilgisi" }, { title: "Sözcükte Yapı" }, { title: "Sözcük Türleri" },
      { title: "Fiil(Eylem)" }, { title: "Cümlenin Ögeleri" }, { title: "Cümle Türleri" },
      { title: "Yazım Kuralları" },  { title: "Noktalama İşaretleri" },
      { title: "Anlatım Bozuklukları" }, { title: "Sözcükte Anlam" } , { title: "Cümlede Anlam" } , { title: "Paragraf Bilgisi" }, { title: "Sözel Mantık"}
    ]
  },
  {
    name: "Matematik",
    topics: [
      { title: "Temel Kavramlar" }, { title: "Sayılar" }, { title: "Bölme-Bölünebilme" },
      { title: "Asal Çarpanlara Ayırma" }, { title: "EBOB-EKOK" }, { title: "Birinci Dereceden Denklemler" },
      { title: "Rasyonel Sayılar" }, { title: "Eşitsizlikler" }, { title: "Mutlak Değer" },
      { title: "Üslü Sayılar" }, { title: "Çarpanlara Ayırma" }, { title: "Köklü Sayılar" },
      { title: "Oran Orantı" }, { title: "Problemler" }, { title: "Kümeler" },
      { title: "Fonksiyon" }, { title: "Permütasyon-Kombinasyon-Olasılık" },
      { title: "Modüler Aritmetik" }, { title: "Tablo ve Grafikler" }, { title: "Sayısal Mantık" }
    ]
  },
  {
    name: "Tarih",
    topics: [
      { title: "İslamiyet Öncesi Türk Tarihi" }, { title: "Türk-İslam Tarihi" },
      { title: "Osmanlı Tarihi" }, { title: "Osmanlı Yenileşme Hareketleri" },
      { title: "Avrupa'da Gelişmeler" }, { title: "XX. Yüzyılda Osmanlı" },
      { title: "Kurtuluş Savaşı Hazırlık" }, { title: "Kurtuluş Savaşı Muharebeler" },
      { title: "Cumhuriyet Dönemi" }, { title: "Atatürk Dönemi Dış Politika" },
      { title: "Çağdaş Türk ve Dünya Tarihi" }
    ]
  },
  {
    name: "Coğrafya",
    topics: [
      { title: "Türkiye'nin Coğrafi Konumu" }, { title: "Türkiye'nin Yer Şekilleri" },
      { title: "Türkiye'nin İklimi ve Bitki Örtüsü" }, { title: "Türkiye'de Nüfus ve Yerleşme" },
      { title: "Tarım, Hayvancılık ve Ormancılık" }, { title: "Madenler, Enerji ve Sanayi" },
      { title: "Ulaşım, Turizm ve Ticaret" }, { title: "Türkiye'nin Bölgesel Coğrafyası" }
    ]
  },
  {
    name: "Vatandaşlık",
    topics: [
      { title: "Hukukun Temel Kavramları" }, { title: "Devlet Biçimleri ve Demokrasi" },
      { title: "Anayasa Hukukuna Giriş" }, { title: "1982 Anayasasının İlkeleri" },
      { title: "Temel Hak ve Hürriyetler" }, { title: "Yasama" }, { title: "Yürütme" },
      { title: "Yargı" }, { title: "İdare Hukuku" }
    ]
  }
];

// 2. Fonksiyonu sadece bir kez tanımlıyoruz
const runSeed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/kpss_takip';
    await mongoose.connect(mongoUri);
    console.log("🔗 MongoDB bağlantısı kuruldu...");
    
    // Eski verileri temizle
    await Lesson.deleteMany({}); 
    console.log("🧹 Eski veriler temizlendi...");

    // Yeni verileri ekle
    await Lesson.insertMany(kpssData);
    console.log("✅ Müfredat başarıyla yüklendi!");
    
    process.exit();
  } catch (err) {
    console.error("❌ Hata:", err);
    process.exit(1);
  }
};

// 3. Çalıştır
runSeed();