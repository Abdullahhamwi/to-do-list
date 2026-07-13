const API_URL = "http://localhost:3000/gorevler";

const gorevGirisi = document.getElementById("gorev-girisi");
const oncelikSecimi = document.getElementById("oncelik-secimi");
const kategoriSecimi = document.getElementById("kategori-secimi");
const sonTarihSecimi = document.getElementById("son-tarih-secimi");
const eklemeButonu = document.getElementById("ekleme-butonu");
const tumunuSilButonu = document.getElementById("tumunu-sil-butonu");
const kutuyuBosaltButonu = document.getElementById("kutuyu-bosalt-butonu");
const gorevListesi = document.getElementById("gorev-listesi");
const hafizaListesi = document.getElementById("hafiza-listesi");
const onerilenlerKutusu = document.getElementById("onerilenler-kutusu");
const temaDegistirButonu = document.getElementById("tema-degistir-butonu");
const filtreButonlari = document.querySelectorAll(".filtre-btn");
const kategoriFiltreSecimi = document.getElementById("kategori-filtre-secimi");
const oncelikFiltreSecimi = document.getElementById("oncelik-filtre-secimi");
const gorevSayaci = document.getElementById("gorev-sayaci");
const disaAktarButonu = document.getElementById("disa-aktar-butonu");
const iceAktarButonu = document.getElementById("ice-aktar-butonu");
const iceAktarInput = document.getElementById("ice-aktar-input");

let aktifFiltre = "hepsi";
let aktifKategoriFiltre = "hepsi";
let aktifOncelikFiltre = "hepsi";
let suruklenenId = null;

// Sunucudan gelen tüm görevlerin (aktif + silinmiş) yerel önbelleği.
// Öneri kutusu ve sayaç gibi anlık işlemler için kullanılır.
let tumGorevlerCache = [];

const ONCELIK_ETIKETLERI = { dusuk: "🟢 Düşük", orta: "🟡 Orta", yuksek: "🔴 Yüksek" };
const KATEGORI_ETIKETLERI = { is: "💼 İş", kisisel: "🏠 Kişisel", okul: "🎓 Okul" };
const AY_KISALTMALARI = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

document.addEventListener("DOMContentLoaded", function () {
  temayiYukle();
  verileriYukle();
});

eklemeButonu.addEventListener("click", gorevEkle);
tumunuSilButonu.addEventListener("click", tumGorevleriCopeAt);
kutuyuBosaltButonu.addEventListener("click", copKutusunuBosalt);
temaDegistirButonu.addEventListener("click", temaDegistir);
disaAktarButonu.addEventListener("click", verileriDisaAktar);
iceAktarButonu.addEventListener("click", () => iceAktarInput.click());
iceAktarInput.addEventListener("change", verileriIceAktar);

filtreButonlari.forEach(function (buton) {
  buton.addEventListener("click", function () {
    filtreButonlari.forEach(b => b.classList.remove("aktif"));
    buton.classList.add("aktif");
    aktifFiltre = buton.dataset.filtre;
    filtreyiUygula();
  });
});

kategoriFiltreSecimi.addEventListener("change", function () {
  aktifKategoriFiltre = kategoriFiltreSecimi.value;
  filtreyiUygula();
});

oncelikFiltreSecimi.addEventListener("change", function () {
  aktifOncelikFiltre = oncelikFiltreSecimi.value;
  filtreyiUygula();
});

gorevGirisi.addEventListener("keypress", function (etkinlik) {
  if (etkinlik.key === "Enter") {
    gorevEkle();
  }
});

gorevGirisi.addEventListener("input", function () {
  const arananMetin = gorevGirisi.value.trim().toLowerCase();
  onerilenlerKutusu.innerHTML = "";
  if (arananMetin === "") {
    onerilenlerKutusu.style.display = "none";
    return;
  }

  const tumMetinler = [...new Set(tumGorevlerCache.map(g => g.metin))];
  const eslesenler = tumMetinler.filter(gorev => gorev.toLowerCase().includes(arananMetin));

  if (eslesenler.length > 0) {
    onerilenlerKutusu.style.display = "block";

    eslesenler.forEach(gorev => {
      const oneriDiv = document.createElement("div");
      oneriDiv.classList.add("oneri-elemani");

      const regex = new RegExp(`(${arananMetin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      const yeniIcerik = gorev.replace(regex, "<strong>$1</strong>");
      oneriDiv.innerHTML = yeniIcerik;

      oneriDiv.addEventListener("click", function () {
        gorevGirisi.value = gorev;
        onerilenlerKutusu.style.display = "none";
        gorevGirisi.focus();
      });

      onerilenlerKutusu.appendChild(oneriDiv);
    });
  } else {
    onerilenlerKutusu.style.display = "none";
  }
});

document.addEventListener("click", function (e) {
  if (e.target !== gorevGirisi) {
    onerilenlerKutusu.style.display = "none";
  }
});

// ---------- API Yardımcı Fonksiyonları ----------

async function apiTumGorevleriGetir() {
  const yanit = await fetch(API_URL);
  if (!yanit.ok) throw new Error("Görevler alınamadı");
  return await yanit.json();
}

async function apiGorevEkle(gorev) {
  const yanit = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(gorev),
  });
  if (!yanit.ok) throw new Error("Görev eklenemedi");
  return await yanit.json();
}

async function apiGorevGuncelle(id, guncellemeler) {
  const yanit = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(guncellemeler),
  });
  if (!yanit.ok) throw new Error("Görev güncellenemedi");
  return await yanit.json();
}

async function apiGorevSil(id) {
  const yanit = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  if (!yanit.ok) throw new Error("Görev silinemedi");
  return await yanit.json();
}

function baglantiHatasiGoster(hata) {
  console.error(hata);
  alert("Sunucuya bağlanılamadı. Backend'in çalıştığından emin olun (node server.js).");
}

// ---------- Tarih Biçimlendirme ----------

function tarihFormatla(isoTarih) {
  if (!isoTarih) return "";
  const parcalar = isoTarih.split("-");
  if (parcalar.length !== 3) return isoTarih;
  const [yil, ay, gun] = parcalar;
  return `${parseInt(gun, 10)} ${AY_KISALTMALARI[parseInt(ay, 10) - 1]} ${yil}`;
}

function tarihGecmisMi(isoTarih) {
  if (!isoTarih) return false;
  const bugun = new Date().toISOString().slice(0, 10);
  return isoTarih < bugun;
}

// ---------- Görev Ekleme ----------

async function gorevEkle() {
  const gorevMetni = gorevGirisi.value.trim();
  if (gorevMetni === "") {
    alert("Lütfen bir görev yazın!");
    return;
  }

  const yeniGorevIstegi = {
    metin: gorevMetni,
    tamamlandi: false,
    oncelik: oncelikSecimi.value || "orta",
    kategori: kategoriSecimi.value || "",
    sonTarih: sonTarihSecimi.value || "",
    silindi: false,
  };

  try {
    const olusturulanGorev = await apiGorevEkle(yeniGorevIstegi);
    tumGorevlerCache.push(olusturulanGorev);
    listeyeGorevEkleArayuz(olusturulanGorev);

    gorevGirisi.value = "";
    sonTarihSecimi.value = "";
    onerilenlerKutusu.style.display = "none";
    gorevGirisi.focus();
    filtreyiUygula();
    gorevSayaciniGuncelle();
  } catch (hata) {
    baglantiHatasiGoster(hata);
  }
}

// ---------- Etiketleri Oluşturma ----------

function etiketleriOlustur(gorev) {
  const satir = document.createElement("div");
  satir.classList.add("etiketler-satiri");

  const oncelikSpan = document.createElement("span");
  oncelikSpan.classList.add("oncelik-etiket", `oncelik-${gorev.oncelik}`);
  oncelikSpan.innerText = ONCELIK_ETIKETLERI[gorev.oncelik] || ONCELIK_ETIKETLERI.orta;
  satir.appendChild(oncelikSpan);

  if (gorev.kategori) {
    const kategoriSpan = document.createElement("span");
    kategoriSpan.classList.add("kategori-etiket");
    kategoriSpan.innerText = KATEGORI_ETIKETLERI[gorev.kategori] || gorev.kategori;
    satir.appendChild(kategoriSpan);
  }

  if (gorev.sonTarih) {
    const tarihSpan = document.createElement("span");
    const gecmisMi = tarihGecmisMi(gorev.sonTarih) && !gorev.tamamlandi;
    tarihSpan.classList.add("tarih-etiket");
    if (gecmisMi) tarihSpan.classList.add("gecmis");
    tarihSpan.innerText = (gecmisMi ? "⏰ " : "📅 ") + tarihFormatla(gorev.sonTarih);
    satir.appendChild(tarihSpan);
  }

  return satir;
}

// ---------- Aktif Liste Arayüzü ----------

function listeyeGorevEkleArayuz(gorev) {
  const li = document.createElement("li");
  li.dataset.id = gorev.id;
  li.dataset.tamamlandi = gorev.tamamlandi ? "true" : "false";
  li.dataset.kategori = gorev.kategori || "none";
  li.dataset.oncelik = gorev.oncelik;
  li.draggable = true;

  const tutamac = document.createElement("span");
  tutamac.classList.add("surukle-tutamaci");
  tutamac.innerText = "⠿";
  li.appendChild(tutamac);

  const icerik = document.createElement("div");
  icerik.classList.add("gorev-icerik");

  const metinAlani = document.createElement("span");
  metinAlani.classList.add("gorev-metni");
  metinAlani.innerText = gorev.metin;
  if (gorev.tamamlandi) {
    metinAlani.classList.add("tamamlandi");
  }
  icerik.appendChild(metinAlani);
  icerik.appendChild(etiketleriOlustur(gorev));

  metinAlani.addEventListener("click", async function () {
    const yeniDurum = !metinAlani.classList.contains("tamamlandi");
    metinAlani.classList.toggle("tamamlandi", yeniDurum);
    li.dataset.tamamlandi = yeniDurum ? "true" : "false";
    gorev.tamamlandi = yeniDurum;

    const eskiEtiketler = icerik.querySelector(".etiketler-satiri");
    icerik.replaceChild(etiketleriOlustur(gorev), eskiEtiketler);
    filtreyiUygula();
    gorevSayaciniGuncelle();

    try {
      await apiGorevGuncelle(gorev.id, { tamamlandi: yeniDurum });
    } catch (hata) {
      baglantiHatasiGoster(hata);
    }
  });

  const duzenlemeyiBaslat = function () {
    duzenlemeModunuAc(li, gorev);
  };
  metinAlani.addEventListener("dblclick", duzenlemeyiBaslat);

  li.appendChild(icerik);

  const duzenleButonu = document.createElement("button");
  duzenleButonu.classList.add("duzenle-butonu");
  duzenleButonu.innerText = "Düzenle";
  duzenleButonu.addEventListener("click", duzenlemeyiBaslat);

  const silButonu = document.createElement("button");
  silButonu.classList.add("silme-butonu");
  silButonu.innerText = "Sil";
  silButonu.addEventListener("click", async function () {
    li.remove();
    await gorevHafizayaTasi(gorev.id);
    gorevSayaciniGuncelle();
  });

  const butonGrubu = document.createElement("div");
  butonGrubu.classList.add("buton-grubu");
  butonGrubu.appendChild(duzenleButonu);
  butonGrubu.appendChild(silButonu);

  li.appendChild(butonGrubu);

  suruklemeOlaylariniBagla(li);

  gorevListesi.appendChild(li);
}

// ---------- Düzenleme Modu (metin + öncelik + kategori + tarih) ----------

function duzenlemeModunuAc(li, gorev) {
  const icerik = li.querySelector(".gorev-icerik");
  icerik.innerHTML = "";
  li.draggable = false;

  const metinGirisi = document.createElement("input");
  metinGirisi.type = "text";
  metinGirisi.classList.add("duzenleme-girisi");
  metinGirisi.value = gorev.metin;
  icerik.appendChild(metinGirisi);

  const detaySatiri = document.createElement("div");
  detaySatiri.classList.add("detay-secenekleri");
  detaySatiri.style.marginBottom = "0";

  const oncelikGrubu = document.createElement("div");
  oncelikGrubu.classList.add("detay-grubu");
  const oncelikSelect = document.createElement("select");
  [["dusuk", "🟢 Düşük"], ["orta", "🟡 Orta"], ["yuksek", "🔴 Yüksek"]].forEach(([deger, etiket]) => {
    const secenek = document.createElement("option");
    secenek.value = deger;
    secenek.innerText = etiket;
    if (deger === gorev.oncelik) secenek.selected = true;
    oncelikSelect.appendChild(secenek);
  });
  oncelikGrubu.appendChild(oncelikSelect);

  const kategoriGrubu = document.createElement("div");
  kategoriGrubu.classList.add("detay-grubu");
  const kategoriSelect = document.createElement("select");
  [["", "Kategori Yok"], ["is", "💼 İş"], ["kisisel", "🏠 Kişisel"], ["okul", "🎓 Okul"]].forEach(([deger, etiket]) => {
    const secenek = document.createElement("option");
    secenek.value = deger;
    secenek.innerText = etiket;
    if (deger === (gorev.kategori || "")) secenek.selected = true;
    kategoriSelect.appendChild(secenek);
  });
  kategoriGrubu.appendChild(kategoriSelect);

  const tarihGrubu = document.createElement("div");
  tarihGrubu.classList.add("detay-grubu");
  const tarihGirisi = document.createElement("input");
  tarihGirisi.type = "date";
  tarihGirisi.value = gorev.sonTarih || "";
  tarihGrubu.appendChild(tarihGirisi);

  detaySatiri.appendChild(oncelikGrubu);
  detaySatiri.appendChild(kategoriGrubu);
  detaySatiri.appendChild(tarihGrubu);
  icerik.appendChild(detaySatiri);

  const kaydetIptalSatiri = document.createElement("div");
  kaydetIptalSatiri.classList.add("buton-grubu");
  kaydetIptalSatiri.style.marginTop = "8px";

  const kaydetButonu = document.createElement("button");
  kaydetButonu.classList.add("duzenle-butonu");
  kaydetButonu.innerText = "Kaydet";

  const iptalButonu = document.createElement("button");
  iptalButonu.classList.add("silme-butonu");
  iptalButonu.innerText = "İptal";

  kaydetIptalSatiri.appendChild(kaydetButonu);
  kaydetIptalSatiri.appendChild(iptalButonu);
  icerik.appendChild(kaydetIptalSatiri);

  metinGirisi.focus();
  metinGirisi.select();

  let islemTamamlandi = false;

  const kaydet = async function () {
    if (islemTamamlandi) return;
    islemTamamlandi = true;

    const yeniMetin = metinGirisi.value.trim();
    if (yeniMetin === "") {
      await listedenYenidenOlustur();
      return;
    }

    try {
      await apiGorevGuncelle(gorev.id, {
        metin: yeniMetin,
        oncelik: oncelikSelect.value,
        kategori: kategoriSelect.value,
        sonTarih: tarihGirisi.value,
      });
    } catch (hata) {
      baglantiHatasiGoster(hata);
    }

    await listedenYenidenOlustur();
  };

  const iptal = async function () {
    if (islemTamamlandi) return;
    islemTamamlandi = true;
    await listedenYenidenOlustur();
  };

  kaydetButonu.addEventListener("click", kaydet);
  iptalButonu.addEventListener("click", iptal);

  metinGirisi.addEventListener("keydown", function (etkinlik) {
    if (etkinlik.key === "Enter") {
      kaydet();
    } else if (etkinlik.key === "Escape") {
      iptal();
    }
  });
}

async function listedenYenidenOlustur() {
  gorevListesi.innerHTML = "";
  try {
    const tumGorevler = await apiTumGorevleriGetir();
    tumGorevlerCache = tumGorevler;
    tumGorevler.filter(g => !g.silindi).forEach(listeyeGorevEkleArayuz);
    filtreyiUygula();
    gorevSayaciniGuncelle();
  } catch (hata) {
    baglantiHatasiGoster(hata);
  }
}

// ---------- Sürükle-Bırak Sıralama ----------

function suruklemeOlaylariniBagla(li) {
  li.addEventListener("dragstart", function (e) {
    suruklenenId = li.dataset.id;
    li.classList.add("surukleniyor");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", li.dataset.id);
  });

  li.addEventListener("dragend", function () {
    li.classList.remove("surukleniyor");
    gorevListesi.querySelectorAll("li").forEach(el => el.classList.remove("surukle-uzerinde"));
    suruklenenId = null;
  });

  li.addEventListener("dragover", function (e) {
    e.preventDefault();
    if (li.dataset.id === suruklenenId) return;
    li.classList.add("surukle-uzerinde");
  });

  li.addEventListener("dragleave", function () {
    li.classList.remove("surukle-uzerinde");
  });

  li.addEventListener("drop", function (e) {
    e.preventDefault();
    li.classList.remove("surukle-uzerinde");
    const hedefId = li.dataset.id;
    if (!suruklenenId || suruklenenId === hedefId) return;
    siraDegistir(suruklenenId, hedefId);
  });
}

async function siraDegistir(kaynakId, hedefId) {
  let aktifGorevler = tumGorevlerCache.filter(g => !g.silindi);
  const kaynakIndeks = aktifGorevler.findIndex(g => g.id === kaynakId);
  const hedefIndeks = aktifGorevler.findIndex(g => g.id === hedefId);
  if (kaynakIndeks === -1 || hedefIndeks === -1) return;

  const [kaynakGorev] = aktifGorevler.splice(kaynakIndeks, 1);
  aktifGorevler.splice(hedefIndeks, 0, kaynakGorev);

  try {
    // Yeni sırayı "sira" alanı olarak sunucuya kaydet.
    await Promise.all(
      aktifGorevler.map((gorev, index) => apiGorevGuncelle(gorev.id, { sira: index }))
    );
  } catch (hata) {
    baglantiHatasiGoster(hata);
  }

  await listedenYenidenOlustur();
}

// ---------- Hafıza (Geri Dönüşüm Kutusu) Arayüzü ----------

function hafizaListesineEkleArayuz(gorev) {
  const li = document.createElement("li");
  li.dataset.id = gorev.id;

  const icerik = document.createElement("div");
  icerik.classList.add("gorev-icerik");

  const metinAlani = document.createElement("span");
  metinAlani.classList.add("gorev-metni");
  metinAlani.innerText = gorev.metin;
  if (gorev.tamamlandi) {
    metinAlani.classList.add("tamamlandi");
  }
  icerik.appendChild(metinAlani);
  icerik.appendChild(etiketleriOlustur(gorev));

  li.appendChild(icerik);

  const butonGrubu = document.createElement("div");
  butonGrubu.classList.add("buton-grubu");

  const geriAlButonu = document.createElement("button");
  geriAlButonu.classList.add("geri-al-butonu");
  geriAlButonu.innerText = "Geri Al";
  geriAlButonu.addEventListener("click", async function () {
    li.remove();
    await hafizadanGeriYukle(gorev.id);
  });

  const kesinSilButonu = document.createElement("button");
  kesinSilButonu.classList.add("silme-butonu");
  kesinSilButonu.innerText = "Sil";
  kesinSilButonu.addEventListener("click", async function () {
    li.remove();
    await hafizadanTamamenSil(gorev.id);
  });

  butonGrubu.appendChild(geriAlButonu);
  butonGrubu.appendChild(kesinSilButonu);
  li.appendChild(butonGrubu);

  if (hafizaListesi) {
    hafizaListesi.appendChild(li);
  }
}

// ---------- Kalıcılık (Backend API) ----------

async function verileriYukle() {
  try {
    const tumGorevler = await apiTumGorevleriGetir();
    tumGorevlerCache = tumGorevler;

    const aktifGorevler = tumGorevler
      .filter(g => !g.silindi)
      .sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
    const silinenler = tumGorevler.filter(g => g.silindi);

    aktifGorevler.forEach(listeyeGorevEkleArayuz);
    silinenler.forEach(hafizaListesineEkleArayuz);

    filtreyiUygula();
    gorevSayaciniGuncelle();
  } catch (hata) {
    baglantiHatasiGoster(hata);
  }
}

async function tumGorevleriCopeAt() {
  const aktifGorevler = tumGorevlerCache.filter(g => !g.silindi);
  if (aktifGorevler.length === 0) {
    alert("Zaten çöp kutusuna atılacak aktif bir görev yok!");
    return;
  }

  const onay = confirm("Aktif listedeki TÜM görevleri çöp kutusuna taşımak istiyor musunuz?");
  if (!onay) return;

  try {
    await Promise.all(aktifGorevler.map(gorev => apiGorevGuncelle(gorev.id, { silindi: true })));
    gorevListesi.innerHTML = "";
    hafizaListesi.innerHTML = "";
    await verileriYukle();
  } catch (hata) {
    baglantiHatasiGoster(hata);
  }
}

async function copKutusunuBosalt() {
  const silinenler = tumGorevlerCache.filter(g => g.silindi);

  if (silinenler.length === 0) {
    alert("Çöp kutusu zaten boş!");
    return;
  }

  const onay = confirm("Çöp kutusundaki TÜM görevleri geri alınamayacak şekilde tamamen silmek istediğinize emin misiniz?");
  if (!onay) return;

  try {
    await Promise.all(silinenler.map(gorev => apiGorevSil(gorev.id)));
    hafizaListesi.innerHTML = "";
    tumGorevlerCache = tumGorevlerCache.filter(g => !g.silindi);
  } catch (hata) {
    baglantiHatasiGoster(hata);
  }
}

async function gorevHafizayaTasi(id) {
  try {
    await apiGorevGuncelle(id, { silindi: true });
    const gorev = tumGorevlerCache.find(g => g.id === id);
    if (gorev) {
      gorev.silindi = true;
      hafizaListesineEkleArayuz(gorev);
    }
  } catch (hata) {
    baglantiHatasiGoster(hata);
  }
}

async function hafizadanGeriYukle(id) {
  try {
    await apiGorevGuncelle(id, { silindi: false });
    const gorev = tumGorevlerCache.find(g => g.id === id);
    if (gorev) {
      gorev.silindi = false;
      listeyeGorevEkleArayuz(gorev);
      filtreyiUygula();
      gorevSayaciniGuncelle();
    }
  } catch (hata) {
    baglantiHatasiGoster(hata);
  }
}

async function hafizadanTamamenSil(id) {
  try {
    await apiGorevSil(id);
    tumGorevlerCache = tumGorevlerCache.filter(g => g.id !== id);
  } catch (hata) {
    baglantiHatasiGoster(hata);
  }
}

// ---------- Filtreleme ----------

function filtreyiUygula() {
  const liListesi = gorevListesi.querySelectorAll("li");
  liListesi.forEach(function (li) {
    const tamamlandiMi = li.dataset.tamamlandi === "true";
    const kategori = li.dataset.kategori;
    const oncelik = li.dataset.oncelik;

    let gorunsunMu = true;

    if (aktifFiltre === "yapilacak") {
      gorunsunMu = gorunsunMu && !tamamlandiMi;
    } else if (aktifFiltre === "tamamlanan") {
      gorunsunMu = gorunsunMu && tamamlandiMi;
    }

    if (aktifKategoriFiltre !== "hepsi") {
      gorunsunMu = gorunsunMu && (kategori === aktifKategoriFiltre);
    }

    if (aktifOncelikFiltre !== "hepsi") {
      gorunsunMu = gorunsunMu && (oncelik === aktifOncelikFiltre);
    }

    li.classList.toggle("gizli", !gorunsunMu);
  });
}

// ---------- Görev Sayacı ----------

function gorevSayaciniGuncelle() {
  const aktifGorevler = tumGorevlerCache.filter(g => !g.silindi);
  const yapilacakSayisi = aktifGorevler.filter(g => !g.tamamlandi).length;

  if (aktifGorevler.length === 0) {
    gorevSayaci.innerText = "Henüz görev eklenmedi";
  } else if (yapilacakSayisi === 0) {
    gorevSayaci.innerText = "Tüm görevler tamamlandı! 🎉";
  } else {
    gorevSayaci.innerText = `${yapilacakSayisi} görev kaldı (toplam ${aktifGorevler.length})`;
  }
}

// ---------- Karanlık Mod ----------
// Not: Tema tercihi backend'i ilgilendirmediği için tarayıcıda (localStorage) tutulmaya devam eder.

function temaDegistir() {
  document.body.classList.toggle("karanlik-mod");
  const karanlikMi = document.body.classList.contains("karanlik-mod");
  temaDegistirButonu.innerText = karanlikMi ? "☀️" : "🌙";
  localStorage.setItem("tema", karanlikMi ? "karanlik" : "aydinlik");
}

function temayiYukle() {
  const kayitliTema = localStorage.getItem("tema");
  if (kayitliTema === "karanlik") {
    document.body.classList.add("karanlik-mod");
    temaDegistirButonu.innerText = "☀️";
  }
}

// ---------- Yedekleme (Dışa Aktar / İçe Aktar) ----------

async function verileriDisaAktar() {
  try {
    const tumGorevler = await apiTumGorevleriGetir();
    const gorevler = tumGorevler.filter(g => !g.silindi);
    const silinenler = tumGorevler.filter(g => g.silindi);

    const yedek = { gorevler, silinenler, tarih: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(yedek, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "todo-yedek.json";
    link.click();

    URL.revokeObjectURL(url);
  } catch (hata) {
    baglantiHatasiGoster(hata);
  }
}

function verileriIceAktar(etkinlik) {
  const dosya = etkinlik.target.files[0];
  if (!dosya) return;

  const okuyucu = new FileReader();
  okuyucu.onload = async function (e) {
    try {
      const yedek = JSON.parse(e.target.result);

      if (!Array.isArray(yedek.gorevler) || !Array.isArray(yedek.silinenler)) {
        throw new Error("Geçersiz format");
      }

      const onay = confirm("İçe aktarma, sunucudaki mevcut tüm görevlerin ve çöp kutusunun üzerine yazacak. Devam etmek istiyor musunuz?");
      if (!onay) {
        iceAktarInput.value = "";
        return;
      }

      // Sunucudaki mevcut kayıtları temizle.
      const mevcutGorevler = await apiTumGorevleriGetir();
      await Promise.all(mevcutGorevler.map(g => apiGorevSil(g.id)));

      // Yedekteki görevleri sunucuya tek tek gönder.
      const tumIceAktarilacaklar = [
        ...yedek.gorevler.map(g => ({ ...g, silindi: false })),
        ...yedek.silinenler.map(g => ({ ...g, silindi: true })),
      ];

      for (const gorev of tumIceAktarilacaklar) {
        await apiGorevEkle({
          metin: gorev.metin,
          tamamlandi: !!gorev.tamamlandi,
          oncelik: gorev.oncelik || "orta",
          kategori: gorev.kategori || "",
          sonTarih: gorev.sonTarih || "",
          silindi: !!gorev.silindi,
        });
      }

      gorevListesi.innerHTML = "";
      hafizaListesi.innerHTML = "";
      await verileriYukle();

      alert("Veriler başarıyla içe aktarıldı!");
    } catch (hata) {
      console.error(hata);
      alert("Dosya okunamadı ya da sunucuya aktarılamadı. Lütfen geçerli bir yedek dosyası ve çalışan bir backend olduğundan emin olun.");
    } finally {
      iceAktarInput.value = "";
    }
  };
  okuyucu.readAsText(dosya);
}