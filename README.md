# 🎓 ITAKA — Inspirasi Talenta dan Kompetensi Anak

<p align="center">
  <strong>Platform showcase portofolio dan talenta siswa berbasis web.</strong><br>
  Temukan, tampilkan, dan kelola bakat & keahlian peserta didik terbaik.
</p>

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
| :--- | :--- |
| 📋 **Manajemen Data Siswa** | CRUD lengkap: tambah, edit, hapus data siswa |
| 🏷️ **Talenta & Keahlian** | Tag badge per siswa (Robotik, UI/UX, dll.) |
| 📄 **Dokumen Portofolio** | Upload & preview PDF, Word (.docx), dan gambar langsung di browser |
| 🔍 **Pencarian & Filter** | Real-time search nama/kelas/talenta + filter kelas (X, XI, XII) |
| 🔐 **Autentikasi Guru** | Login via kode akses → JWT token (aman, server-side) |
| 🌙 **Dark Theme Premium** | UI modern dengan TailwindCSS + Plus Jakarta Sans |
| 💾 **Dual Storage** | JSON file store (lokal) + Baserow self-hosted (production) |
| ☁️ **Deploy ke Vercel** | Serverless deployment via GitHub → Vercel |

---

## 🏗️ Arsitektur

```
┌─────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│   Browser   │────▶│  Vercel / Express.js  │────▶│  Baserow (DB)    │
│  (Frontend) │◀────│  Serverless / Server  │◀────│  Self-Hosted     │
└─────────────┘     └──────────────────────┘     └──────────────────┘
                             │
                    ┌────────┴────────┐
                    │  JSON File DB   │
                    │  (dev fallback) │
                    └─────────────────┘
```

### Storage Adapter (Otomatis)

| Environment | Primary DB | Sync Target |
| :--- | :--- | :--- |
| **Lokal (dev)** | JSON File | Baserow (opsional) |
| **Vercel (production)** | Baserow | — |

---

## 📁 Struktur Proyek

```
Talenta/
├── api/
│   └── index.js              # Vercel serverless entry point
├── public/
│   └── index.html             # Frontend SPA
├── src/
│   ├── config/
│   │   ├── database.js        # JSON file store (zero native deps)
│   │   ├── baserow.js         # Baserow REST API client
│   │   └── storage.js         # Storage adapter (auto-switch)
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication
│   │   └── upload.js          # Multer (hardened file upload)
│   └── routes/
│       ├── auth.js            # Login/verify/logout
│       ├── students.js        # CRUD siswa
│       └── documents.js       # Upload/hapus dokumen
├── data/                      # SQLite database (auto-generated)
├── uploads/                   # File uploads (lokal)
├── docs/
│   ├── DEPLOYMENT.md          # Tutorial deploy lengkap
│   └── API.md                 # Dokumentasi REST API
├── server.js                  # Express entry point
├── package.json
├── vercel.json                # Konfigurasi Vercel
├── docker-compose.baserow.yml # Baserow self-hosted
├── .env.example               # Template environment variables
└── .gitignore
```

---

## 🚀 Quick Start (Development Lokal)

### Prasyarat
- [Node.js](https://nodejs.org/) v18+
- [Git](https://git-scm.com/)

### 1. Clone & Install

```bash
git clone https://github.com/username/itaka.git
cd itaka
npm install
```

### 2. Konfigurasi Environment

```bash
cp .env.example .env
# Edit .env sesuai kebutuhan (minimal biarkan default untuk dev)
```

### 3. Jalankan Server

```bash
npm start
# atau untuk auto-reload:
npm run dev
```

### 4. Buka di Browser

```
http://localhost:3000
```

> 💡 Pada mode lokal, data tersimpan di **JSON file** (`data/itaka-db.json`).
> Baserow tidak diperlukan untuk development.

---

## ☁️ Deploy ke Vercel

Lihat [**docs/DEPLOYMENT.md**](docs/DEPLOYMENT.md) untuk tutorial deploy lengkap step-by-step.

**Ringkasan singkat:**

1. Push kode ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Set environment variables (Baserow URL, Token, Table IDs)
4. Deploy! ✅

---

## 🔑 Environment Variables

| Variable | Wajib | Default | Deskripsi |
| :--- | :---: | :--- | :--- |
| `PORT` | ❌ | `3000` | Port server (lokal) |
| `JWT_SECRET` | ✅ | - | Kunci rahasia JWT (WAJIB diganti di production!) |
| `GURU_CODES` | ✅ | `123456` | Kode akses guru, pisahkan dengan koma |
| `JWT_EXPIRES_IN` | ❌ | `8h` | Masa berlaku token JWT |
| `BASEROW_URL` | ☁️ | - | URL Baserow (wajib di Vercel) |
| `BASEROW_TOKEN` | ☁️ | - | Database Token Baserow |
| `BASEROW_TABLE_STUDENTS_ID` | ☁️ | - | Table ID tabel siswa |
| `BASEROW_TABLE_DOCUMENTS_ID` | ❌ | - | Table ID tabel dokumen |
| `MAX_FILE_SIZE` | ❌ | `10485760` | Maks ukuran upload (bytes) |

> ☁️ = Wajib saat deploy ke Vercel

---

## 📖 Dokumentasi Lebih Lanjut

- [**Tutorial Deploy Lengkap**](docs/DEPLOYMENT.md) — GitHub → Vercel + Baserow self-hosted
- [**Dokumentasi REST API**](docs/API.md) — Semua endpoint, request/response, contoh cURL

---

## 🛡️ Keamanan

- ✅ Kode akses guru disimpan **server-side** (`.env`), bukan di frontend
- ✅ Autentikasi JWT dengan expiry yang dapat dikonfigurasi
- ✅ Upload file dibatasi: whitelist ekstensi (PDF, DOC, DOCX, JPG, PNG) + max 10MB
- ✅ Endpoint sensitif dilindungi middleware `requireGuru`
- ✅ CORS dikonfigurasi via Vercel headers

---

## 📄 Lisensi

MIT License © 2026 ITAKA Team
