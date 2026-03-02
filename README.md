# Pasukan Katak Orange - API Server

Data pengelolaan sampah Kali Bekasi oleh Pasukan Katak Orange, Dinas Lingkungan Hidup Kota Bekasi.

## 🚀 Deployment ke Railway.app

### Langkah 1: Persiapan di GitHub

1. **Fork atau buat repository baru** di GitHub
2. **Upload semua file project** (index.js, package.json, index.html, dan file frontend lainnya) ke repository
3. **Pastikan struktur folder seperti ini:**
   ```
   /
   ├── index.js          (server backend)
   ├── package.json      (dependensi Node.js)
   ├── index.html        (halaman utama)
   ├── dashboard.html    (halaman dashboard)
   ├── education.html    (halaman edukasi)
   ├── gallery.html      (halaman galeri)
   ├── login.html        (halaman login)
   └── (file CSS, JS, gambar lainnya)
   ```

### Langkah 2: Konfigurasi Railway.app

1. **Login ke [Railway.app](https://railway.app)**
2. **Klik "New Project"** → Pilih "Deploy from GitHub repo"
3. **Pilih repository** yang berisi project ini
4. **Klik "Add Variables"** untuk menambahkan environment variables:

#### Environment Variables Wajib:

| Variable | Keterangan | Contoh Value |
|----------|-----------|--------------|
| `PORT` | Port server (Railway akan mengatur ini otomatis) | `3000` |
| `INSTAGRAM_TOKEN` | Token Instagram API (opsional) | `your_instagram_token` |
| `GOOGLE_CREDENTIALS` | Service account JSON untuk Google Sheets (opsional) | `{"type":"service_account",...}` |

#### Cara Mendapatkan Instagram Token:
1. Kunjungi [Facebook Developers](https://developers.facebook.com/)
2. Buat aplikasi dan dapatkan Instagram Basic Display API token
3. Token format: `YOUR_ACCESS_TOKEN`

#### Cara Mendapatkan Google Credentials:
1. Kunjungi [Google Cloud Console](https://console.cloud.google.com/)
2. Buat service account
3. Download JSON key file
4. Copy isi JSON dan paste ke variable `GOOGLE_CREDENTIALS`

### Langkah 3: Deploy

1. **Railway akan otomatis mendetekci** file `package.json` dan `index.js`
2. **Klik "Deploy"** atau tunggu deploy otomatis
3. **Setelah deploy selesai**, Railway akan memberikan URL publik
4. **Test API** dengan mengunjungi: `https://your-app.railway.app/api/health`

### Langkah 4: Custom Domain (Opsional)

1. Di dashboard Railway, klik project Anda
2. Pilih tab **Settings** → **Domains**
3. Klik **"Custom Domain"**
4. Masukkan domain Anda dan ikuti instruksi DNS

## 🔧 Troubleshooting

### Masalah: API mengembalikan HTML bukan JSON

**Solusi:** Pastikan file `index.js` sudah diupdate dengan fix terbaru:
- Catch-all route harus return 404 untuk path `/api/*`
- Static file serving harus menggunakan `__dirname` bukan `path.join(__dirname, "..")`

### Masalah: Server tidak start

**Cek logs di Railway:**
1. Buka dashboard Railway
2. Klik tab **Deployments**
3. Klik **View Logs**

**Penyebab umum:**
- Port tidak di-set (Railway akan otomatis set `PORT`)
- Module tidak ditemukan → Pastikan `package.json` sudah di-push
- Syntax error → Cek logs untuk detail error

### Masalah: Static files (CSS/JS) tidak load

**Solusi:**
- Pastikan file HTML, CSS, JS berada di folder yang sama dengan `index.js`
- Cek browser console untuk error 404
- Pastikan path di HTML menggunakan path relatif (contoh: `./style.css`)

## 📁 File yang Diperlukan di Repository

```
📦 project-root/
├── 📄 index.js              ← Server backend (WAJIB)
├── 📄 package.json          ← Dependensi Node.js (WAJIB)
├── 📄 index.html            ← Halaman utama
├── 📄 dashboard.html        ← Halaman dashboard data
├── 📄 education.html        ← Halaman edukasi
├── 📄 gallery.html          ← Halaman galeri
├── 📄 login.html            ← Halaman login
├── 📁 css/                  ← Folder stylesheet
├── 📁 js/                   ← Folder JavaScript
└── 📁 img/                  ← Folder gambar
```

## 🔌 API Endpoints

| Endpoint | Method | Auth | Keterangan |
|----------|--------|------|------------|
| `/api/health` | GET | No | Cek status server |
| `/api/statistics` | GET | No | Statistik data sampah |
| `/api/reports` | GET | No | Daftar laporan sampah |
| `/api/auth/login` | POST | No | Login user |
| `/api/auth/verify` | GET | Yes | Verifikasi token |
| `/api/auth/logout` | POST | Yes | Logout user |
| `/api/reports` | POST | Yes | Tambah laporan baru |
| `/api/reports/batch` | POST | Yes | Tambah batch laporan |
| `/api/admin/data` | GET | Admin | Semua data (admin) |
| `/api/admin/refresh` | POST | Admin | Refresh cache |
| `/api/instagram/feed` | GET | No | Feed Instagram |

## 👥 Default Login

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin2026` | Administrator |
| `jambuxbewok` | `katak2018` | Member |

## 📝 Spreadsheet ID

Data tersimpan di Google Sheets:
```
1SQlPtS8enwmfqnGKixrRvjBVN63cSFFTh06Q7oXPbT8
```

## 🆘 Support

Jika mengalami masalah:
1. Cek logs di Railway Dashboard
2. Pastikan semua environment variables sudah di-set
3. Verifikasi struktur folder sudah benar
4. Test API endpoint `/api/health` terlebih dahulu
