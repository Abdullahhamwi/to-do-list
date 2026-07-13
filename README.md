# To-Do List Uygulaması (Frontend + Backend)

Bu proje, orijinal `localStorage` tabanlı To-Do List uygulamasının **Express.js backend** ile
çalışan, verileri bir JSON dosyasında sunucu tarafında saklayan halidir. Arayüz (buton, filtreler,
sürükle-bırak, karanlık mod) birebir aynı kaldı; sadece veri okuma/yazma işlemleri artık
`fetch()` ile backend'e yapılıyor.

```
proje/
├── backend/
│   ├── server.js        # Express API sunucusu
│   ├── package.json
│   ├── gorevler.json    # Görevlerin saklandığı veri dosyası (otomatik oluşur)
│   └── .gitignore
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js         # localStorage yerine fetch() kullanan versiyon
```

## API Uç Noktaları

| Metot  | Yol                | Açıklama                                   |
|--------|--------------------|---------------------------------------------|
| GET    | `/gorevler`         | Tüm görevleri döndürür (aktif + silinmiş, `silindi` alanına göre ayrılır) |
| POST   | `/gorevler`         | Yeni görev ekler                            |
| PUT    | `/gorevler/:id`     | Görevi düzenler / tamamlandı ya da silindi durumunu değiştirir |
| DELETE | `/gorevler/:id`     | Görevi kalıcı olarak siler                  |

## Nasıl Çalıştırılır

### 1. Backend'i başlatın

```bash
cd backend
npm install
node server.js
```

Sunucu varsayılan olarak `http://localhost:3000` adresinde çalışır. Terminalde
`✅ Sunucu çalışıyor: http://localhost:3000` yazısını görmelisiniz.

### 2. Frontend'i açın

Backend çalışırken, ayrı bir terminalde (veya doğrudan tarayıcıdan) `frontend/index.html`
dosyasını açın. En sağlıklısı basit bir statik sunucu kullanmaktır, örneğin:

```bash
cd frontend
npx serve .
# veya VS Code'da "Live Server" eklentisiyle index.html'i açın
```

Tarayıcıda açılan adrese gidin (örn. `http://localhost:5000`). Sayfa açılır açılmaz
`script.js`, `http://localhost:3000/gorevler` adresine `GET` isteği atıp mevcut görevleri
çekecektir.

> Not: `frontend/script.js` dosyasının en üstündeki `API_URL` sabiti backend adresinizi
> gösterir. Backend'i farklı bir portta veya adreste çalıştırırsanız burayı güncelleyin.

### 3. Test edin

- Yeni görev ekleyin → backend'de `gorevler.json` dosyasına yazıldığını görebilirsiniz.
- Sayfayı yenileyin → görevler kaybolmaz, çünkü artık `localStorage` değil, sunucu kullanılıyor.
- Görevi silin → "Geri Dönüşüm Kutusu"na taşınır (soft delete, `silindi: true`).
- Kutuyu boşaltın → kalıcı olarak `DELETE` ile silinir.

## GitHub'a Nasıl Push Edilir

Aşağıdaki adımlar, `frontend` ve `backend` klasörlerini **tek bir repoda** iki klasör olarak
push etmek içindir (istenirse ayrı repo olarak da yapılabilir, mantık aynıdır).

### 1. Yerelde bir Git deposu başlatın

Proje klasörünün (bu README'nin bulunduğu klasör) içinde:

```bash
git init
git add .
git commit -m "İlk commit: frontend + backend to-do list"
```

### 2. GitHub'da boş bir repo oluşturun

- github.com → sağ üstte **+** → **New repository**
- Repo adını girin (örn. `to-do-list`)
- **"Initialize this repository with a README"** kutusunu **işaretlemeyin** (zaten kendi README'niz var)
- **Create repository** butonuna basın

### 3. Yerel repoyu GitHub'daki repoya bağlayın ve push edin

GitHub'ın oluşturduğu sayfada size özel komutlar gösterilecek, genel hali şöyledir:

```bash
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/to-do-list.git
git push -u origin main
```

`KULLANICI_ADINIZ` ve repo adını kendi bilgilerinizle değiştirin. İlk push'ta GitHub kullanıcı
adı/şifre (ya da Personal Access Token) isteyebilir — GitHub artık şifre yerine
[Personal Access Token](https://github.com/settings/tokens) kullanılmasını istiyor.

### 4. (Alternatif) Ayrı repo/branch olarak push etmek isterseniz

**Ayrı repo:**
```bash
cd backend
git init && git add . && git commit -m "Backend"
git remote add origin https://github.com/KULLANICI_ADINIZ/to-do-list-backend.git
git push -u origin main

cd ../frontend
git init && git add . && git commit -m "Frontend"
git remote add origin https://github.com/KULLANICI_ADINIZ/to-do-list-frontend.git
git push -u origin main
```

**Ayrı branch (tek repo içinde):**
```bash
git checkout -b backend-only
git add backend/
git commit -m "Backend branch"
git push -u origin backend-only

git checkout main
git checkout -b frontend-only
git add frontend/
git commit -m "Frontend branch"
git push -u origin frontend-only
```

## Notlar

- `backend/gorevler.json` veritabanı yerine geçen basit bir dosyadır; gerçek bir veritabanı
  (SQLite, MongoDB vb.) kullanmak isterseniz sadece `verileriOku`/`verileriYaz` fonksiyonlarını
  değiştirmeniz yeterli, route'ların mantığı aynı kalabilir.
- CORS, backend'de `cors` paketiyle açık bırakıldı; farklı bir origin'den (canlı ortamda farklı
  domain) frontend çalıştırırsanız ekstra ayara gerek yoktur.
- Karanlık mod tercihi backend'i ilgilendirmediği için tarayıcıda (`localStorage`) tutulmaya
  devam ediyor; isterseniz bunu da backend'e taşıyabilirsiniz.
