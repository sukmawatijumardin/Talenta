# 🚀 Tutorial Deploy ITAKA — GitHub + Vercel + Baserow

Panduan lengkap step-by-step untuk men-deploy aplikasi ITAKA ke production.

---

## 📋 Daftar Isi

1. [Gambaran Arsitektur](#1-gambaran-arsitektur)
2. [Prasyarat](#2-prasyarat)
3. [Langkah 1 — Setup Baserow Self-Hosted](#3-langkah-1--setup-baserow-self-hosted)
4. [Langkah 2 — Konfigurasi Tabel Baserow](#4-langkah-2--konfigurasi-tabel-baserow)
5. [Langkah 3 — Push ke GitHub](#5-langkah-3--push-ke-github)
6. [Langkah 4 — Deploy ke Vercel](#6-langkah-4--deploy-ke-vercel)
7. [Langkah 5 — Konfigurasi Domain (Opsional)](#7-langkah-5--konfigurasi-domain-opsional)
8. [Backup & Maintenance](#8-backup--maintenance)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Gambaran Arsitektur

```
                    ┌─────────────────────────┐
                    │      GitHub Repo         │
                    │  (source code ITAKA)     │
                    └────────────┬────────────┘
                                 │ auto-deploy
                                 ▼
┌──────────┐       ┌─────────────────────────┐       ┌─────────────────────┐
│  Browser  │──────▶│      Vercel (CDN)        │──────▶│  Baserow (DB)       │
│  (User)   │◀──────│  Frontend + API (λ)      │◀──────│  Self-Hosted        │
└──────────┘       └─────────────────────────┘       │  (VPS / Docker)     │
                                                      └─────────────────────┘
```

| Komponen | Platform | Fungsi |
| :--- | :--- | :--- |
| **Frontend** | Vercel CDN | Menyajikan `index.html` (static) |
| **Backend API** | Vercel Serverless Functions | REST API Express.js |
| **Database** | Baserow Self-Hosted (Docker) | Penyimpanan data utama |
| **Source Code** | GitHub | Version control + CI/CD trigger |

---

## 2. Prasyarat

- [x] Akun [GitHub](https://github.com)
- [x] Akun [Vercel](https://vercel.com) (gratis, sign up via GitHub)
- [x] Server/VPS untuk Baserow (pilih salah satu):
  - VPS (DigitalOcean, Contabo, Hetzner, dll.) — minimal 2GB RAM
  - Komputer lokal dengan Docker (untuk testing)
  - Atau gunakan [Baserow Cloud](https://baserow.io) (gratis sampai 3000 rows)
- [x] [Docker](https://docs.docker.com/get-docker/) terinstal di server Baserow
- [x] [Node.js](https://nodejs.org/) v18+ (untuk development lokal)
- [x] [Git](https://git-scm.com/) terinstal

---

## 3. Langkah 1 — Setup Baserow Self-Hosted

### Opsi A: VPS / Server (Rekomendasi untuk Production)

**3.1.** SSH ke server Anda:

```bash
ssh user@your-server-ip
```

**3.2.** Pastikan Docker & Docker Compose terinstal:

```bash
docker --version
docker compose version
```

**3.3.** Buat direktori dan file docker-compose:

```bash
mkdir -p ~/baserow && cd ~/baserow
```

Buat file `docker-compose.yml`:

```yaml
services:
  baserow:
    container_name: itaka-baserow
    image: baserow/baserow:latest
    environment:
      # GANTI dengan IP publik atau domain server Anda!
      BASEROW_PUBLIC_URL: "http://YOUR-SERVER-IP:8080"
    ports:
      - "8080:80"
    volumes:
      - baserow_data:/baserow/data
    restart: unless-stopped

volumes:
  baserow_data:
```

> ⚠️ **PENTING**: Ganti `YOUR-SERVER-IP` dengan IP publik server Anda.
> Contoh: `http://103.45.67.89:8080`

**3.4.** Jalankan Baserow:

```bash
docker compose up -d
```

**3.5.** Tunggu ~1-2 menit hingga container healthy:

```bash
docker compose logs -f baserow
# Tunggu sampai muncul "Baserow is now available at..."
# Tekan Ctrl+C untuk keluar dari log
```

**3.6.** Buka di browser:

```
http://YOUR-SERVER-IP:8080
```

**3.7.** Buat akun admin pertama (Anda akan diminta saat pertama kali membuka).

---

### Opsi B: Lokal (Untuk Testing)

Gunakan file yang sudah disediakan di repository:

```bash
cd path/to/itaka
docker compose -f docker-compose.baserow.yml up -d
```

Buka: `http://localhost:8080`

---

### Opsi C: Baserow Cloud (Tanpa Server)

1. Buka [baserow.io](https://baserow.io) → Sign Up (gratis)
2. Buat workspace baru
3. Lanjut ke Langkah 2

---

## 4. Langkah 2 — Konfigurasi Tabel Baserow

### 4.1. Buat Database Baru

1. Login ke Baserow
2. Klik **"+ Create new"** → **"Database"**
3. Beri nama: **`ITAKA`**

### 4.2. Buat Tabel `Students`

Klik **"+ Add table"** → nama: **`Students`**

Tambahkan field-field berikut (klik **"+"** di header kolom):

| Field Name | Type | Keterangan |
| :--- | :--- | :--- |
| `app_id` | **Single line text** | ID unik dari aplikasi |
| `nama` | **Single line text** | Nama lengkap siswa |
| `kelas` | **Single line text** | Kelas (contoh: "XII RPL 1") |
| `nisn` | **Single line text** | Nomor Induk Siswa Nasional |
| `foto` | **URL** | URL foto profil |
| `talenta` | **Long text** | Daftar talenta, pisahkan koma |
| `deskripsi` | **Long text** | Deskripsi/prestasi |

> 💡 Hapus field bawaan `Name` yang dibuat otomatis oleh Baserow (atau rename menjadi `nama`).

### 4.3. Buat Tabel `Documents` (Opsional)

Klik **"+ Add table"** → nama: **`Documents`**

| Field Name | Type | Keterangan |
| :--- | :--- | :--- |
| `student_id` | **Single line text** | app_id siswa pemilik dokumen |
| `file_name` | **Single line text** | Nama file asli |
| `file_type` | **Single line text** | Ekstensi (pdf, jpg, docx) |
| `file_url` | **URL** | URL akses file |
| `server_filename` | **Single line text** | Nama file di server |

### 4.4. Catat Table ID

Setiap tabel memiliki ID numerik. Cara menemukannya:

1. Klik **⋮** (tiga titik vertikal) di samping nama database **ITAKA**
2. Pilih **"View API Docs"**
3. Pada halaman API docs, Anda akan melihat URL endpoint untuk setiap tabel:
   ```
   /api/database/rows/table/YOUR_TABLE_ID/
   ```
4. Catat angka `YOUR_TABLE_ID` untuk tabel **Students** dan **Documents**

Contoh:
- Students Table ID: `12345`
- Documents Table ID: `12346`

### 4.5. Buat Database Token

1. Klik avatar/profil Anda di kiri bawah → **"Settings"**
2. Buka tab **"Database tokens"**
3. Klik **"Create token"**
4. Beri nama: `ITAKA API Token`
5. Berikan permission **create, read, update, delete** untuk database ITAKA
6. **Salin token** yang dihasilkan (simpan baik-baik, hanya ditampilkan sekali!)

---

## 5. Langkah 3 — Push ke GitHub

### 5.1. Inisialisasi Git (jika belum)

```bash
cd path/to/itaka
git init
git add .
git commit -m "Initial commit: ITAKA v1.0.0"
```

### 5.2. Buat Repository di GitHub

1. Buka [github.com/new](https://github.com/new)
2. Nama repository: `itaka` (atau sesuai keinginan)
3. Visibility: **Private** (rekomendasi) atau Public
4. Klik **"Create repository"**

### 5.3. Push ke GitHub

```bash
git remote add origin https://github.com/USERNAME/itaka.git
git branch -M main
git push -u origin main
```

---

## 6. Langkah 4 — Deploy ke Vercel

### 6.1. Import Project

1. Buka [vercel.com/new](https://vercel.com/new)
2. Klik **"Import Git Repository"**
3. Pilih repository `itaka` dari daftar
4. Klik **"Import"**

### 6.2. Konfigurasi Build

Pada halaman konfigurasi:

| Setting | Nilai |
| :--- | :--- |
| Framework Preset | **Other** |
| Build Command | `npm install` |
| Output Directory | `public` |
| Install Command | `npm install` |

### 6.3. Set Environment Variables

Klik **"Environment Variables"** dan tambahkan:

| Key | Value | Contoh |
| :--- | :--- | :--- |
| `JWT_SECRET` | Kunci rahasia panjang & acak | `x7Kp2mQ9vL4nR8wF3jY6` |
| `GURU_CODES` | Kode akses guru | `123456,GURU2026` |
| `BASEROW_URL` | URL Baserow Anda | `http://103.45.67.89:8080` |
| `BASEROW_TOKEN` | Token database Baserow | `abcdef123456...` |
| `BASEROW_TABLE_STUDENTS_ID` | ID tabel Students | `12345` |
| `BASEROW_TABLE_DOCUMENTS_ID` | ID tabel Documents | `12346` |

> ⚠️ **PENTING**: `JWT_SECRET` harus kuat dan unik!
> Gunakan generator: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 6.4. Deploy!

Klik **"Deploy"** dan tunggu proses selesai (~1-2 menit).

Setelah selesai, Anda akan mendapatkan URL seperti:
```
https://itaka-xxxx.vercel.app
```

### 6.5. Verifikasi

1. Buka URL Vercel Anda
2. Cek health endpoint: `https://itaka-xxxx.vercel.app/api/health`
3. Pastikan response menunjukkan Baserow terhubung:
   ```json
   {
     "status": "ok",
     "storage": {
       "mode": "baserow",
       "baserow": { "connected": true }
     }
   }
   ```

### 6.6. Auto-Deploy

Setelah setup awal, setiap `git push` ke branch `main` akan otomatis trigger deploy baru di Vercel! 🎉

---

## 7. Langkah 5 — Konfigurasi Domain (Opsional)

### Custom Domain di Vercel

1. Buka **Settings** → **Domains** di dashboard project Vercel
2. Tambahkan domain custom Anda (contoh: `itaka.sekolah.sch.id`)
3. Ikuti instruksi DNS yang diberikan Vercel:
   - Tambahkan CNAME record: `itaka` → `cname.vercel-dns.com`
   - Atau A record: `76.76.21.21`
4. Tunggu propagasi DNS (~5-30 menit)
5. SSL/HTTPS otomatis aktif! ✅

### HTTPS untuk Baserow

Jika Baserow diakses via HTTPS (rekomendasi untuk production):

1. Set `BASEROW_PUBLIC_URL` ke `https://baserow.yourdomain.com`
2. Gunakan reverse proxy (Nginx/Caddy) di depan Baserow
3. Atau, set `BASEROW_PUBLIC_URL` ke `https://...` dan Baserow akan auto-manage SSL via Caddy bawaan

---

## 8. Backup & Maintenance

### Backup Data Baserow

```bash
# Backup volume Docker
docker run --rm \
  -v baserow_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/baserow-backup-$(date +%Y%m%d).tar.gz -C /data .
```

### Restore Backup

```bash
docker compose -f docker-compose.baserow.yml down
docker run --rm \
  -v baserow_data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/baserow-backup-YYYYMMDD.tar.gz"
docker compose -f docker-compose.baserow.yml up -d
```

### Update Baserow

```bash
docker compose -f docker-compose.baserow.yml pull
docker compose -f docker-compose.baserow.yml up -d
```

### Update Aplikasi ITAKA

```bash
git add .
git commit -m "Update: deskripsi perubahan"
git push origin main
# Vercel akan auto-deploy!
```

---

## 9. Troubleshooting

### ❌ "Baserow tidak dikonfigurasi" di Vercel

**Penyebab**: Environment variables belum di-set di Vercel.

**Solusi**: Buka Vercel → Project Settings → Environment Variables, pastikan `BASEROW_URL`, `BASEROW_TOKEN`, dan `BASEROW_TABLE_STUDENTS_ID` terisi, lalu **Redeploy**.

---

### ❌ "Gagal mengakses tabel Baserow"

**Penyebab**: Token atau Table ID salah, atau Baserow tidak bisa diakses dari Vercel.

**Solusi**:
1. Pastikan Baserow berjalan dan bisa diakses dari internet (bukan `localhost`)
2. Cek bahwa port 8080 terbuka di firewall server
3. Verifikasi token: buka Baserow → Settings → Database tokens
4. Pastikan token punya permission untuk tabel yang benar

---

### ❌ "CORS error" di browser

**Solusi**: Pastikan `vercel.json` memiliki header CORS yang benar (sudah dikonfigurasi di template).

---

### ❌ File upload tidak berfungsi di Vercel

**Penyebab**: Vercel memiliki filesystem ephemeral — file yang di-upload tidak akan bertahan setelah function cold start.

**Solusi untuk production**:
1. Gunakan layanan external storage (Cloudinary, AWS S3, dll.)
2. Atau simpan file kecil sebagai Base64 di Baserow (field type: Long text)
3. Untuk MVP/demo, upload tetap bekerja selama function masih warm

> 📌 Pada development lokal, upload berfungsi normal karena disimpan ke folder `uploads/`.

---

### ❌ "Token tidak valid atau sudah kedaluwarsa"

**Penyebab**: JWT token guru sudah expired.

**Solusi**: Login ulang sebagai guru. Sesuaikan `JWT_EXPIRES_IN` di environment variables jika perlu (contoh: `1d` untuk 1 hari, `7d` untuk 7 hari).

---

## 📊 Checklist Deploy

Gunakan checklist ini untuk memastikan deploy berhasil:

- [ ] Baserow berjalan dan bisa diakses dari internet
- [ ] Tabel `Students` dibuat dengan field yang benar
- [ ] Database Token dibuat dan punya permission CRUD
- [ ] Kode di-push ke GitHub
- [ ] Project di-import ke Vercel
- [ ] Environment variables di-set di Vercel
- [ ] Deploy berhasil (cek Build logs)
- [ ] Health check menunjukkan Baserow terhubung
- [ ] Login sebagai guru berfungsi
- [ ] CRUD siswa berfungsi
- [ ] (Opsional) Custom domain dikonfigurasi
