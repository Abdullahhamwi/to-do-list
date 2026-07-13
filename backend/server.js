const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const VERI_DOSYASI = path.join(__dirname, "gorevler.json");

app.use(cors());
app.use(express.json());



function verileriOku() {
  if (!fs.existsSync(VERI_DOSYASI)) {
    fs.writeFileSync(VERI_DOSYASI, "[]", "utf-8");
    return [];
  }
  try {
    const icerik = fs.readFileSync(VERI_DOSYASI, "utf-8");
    return JSON.parse(icerik);
  } catch (hata) {
    console.error("gorevler.json okunamadı, boş liste ile devam ediliyor:", hata.message);
    return [];
  }
}

function verileriYaz(gorevler) {
  fs.writeFileSync(VERI_DOSYASI, JSON.stringify(gorevler, null, 2), "utf-8");
}

function benzersizIdOlustur() {
  return `g${Date.now()}${Math.floor(Math.random() * 100000)}`;
}


app.get("/gorevler", (req, res) => {
  const gorevler = verileriOku();
  const siraliGorevler = [...gorevler].sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
  res.json(siraliGorevler);
});


app.post("/gorevler", (req, res) => {
  const { metin, oncelik, kategori, sonTarih } = req.body;

  if (!metin || typeof metin !== "string" || metin.trim() === "") {
    return res.status(400).json({ hata: "Görev metni boş olamaz." });
  }

  const gorevler = verileriOku();

  const yeniGorev = {
    id: benzersizIdOlustur(),
    metin: metin.trim(),
    tamamlandi: false,
    oncelik: oncelik || "orta",
    kategori: kategori || "",
    sonTarih: sonTarih || "",
    silindi: false,
    sira: Date.now(),
  };

  gorevler.push(yeniGorev);
  verileriYaz(gorevler);

  res.status(201).json(yeniGorev);
});


app.put("/gorevler/:id", (req, res) => {
  const gorevler = verileriOku();
  const index = gorevler.findIndex((g) => g.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ hata: "Görev bulunamadı." });
  }

  gorevler[index] = { ...gorevler[index], ...req.body, id: gorevler[index].id };
  verileriYaz(gorevler);

  res.json(gorevler[index]);
});


app.delete("/gorevler/:id", (req, res) => {
  const gorevler = verileriOku();
  const bulunanGorev = gorevler.find((g) => g.id === req.params.id);

  if (!bulunanGorev) {
    return res.status(404).json({ hata: "Görev bulunamadı." });
  }

  const guncelListe = gorevler.filter((g) => g.id !== req.params.id);
  verileriYaz(guncelListe);

  res.json({ basarili: true, silinenId: req.params.id });
});

app.listen(PORT, () => {
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
});