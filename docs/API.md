# 📡 ITAKA — Dokumentasi REST API

Base URL:
- **Lokal**: `http://localhost:3000/api`
- **Vercel**: `https://your-project.vercel.app/api`

---

## 🔐 Autentikasi

Endpoint yang membutuhkan autentikasi ditandai dengan 🔒.
Sertakan JWT token di header:

```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Auth — Autentikasi Guru

#### `POST /api/auth/login`

Login dengan kode akses guru.

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response 200:**
```json
{
  "message": "Login berhasil!",
  "role": "guru",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 401:**
```json
{
  "error": "Kode akses salah atau tidak terdaftar.",
  "code": "INVALID_CODE"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

---

#### `GET /api/auth/verify` 🔒

Cek apakah token masih valid.

**Response 200:**
```json
{
  "valid": true,
  "role": "guru",
  "message": "Token valid."
}
```

**cURL:**
```bash
curl http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

#### `POST /api/auth/logout`

Konfirmasi logout (token dihapus di sisi klien).

**Response 200:**
```json
{
  "message": "Logout berhasil. Hapus token dari sisi klien."
}
```

---

### 2. Students — Data Siswa

#### `GET /api/students`

Ambil semua data siswa beserta dokumen.

**Response 200:**
```json
[
  {
    "id": "std-a1b2c3d4",
    "nama": "Ahmad Fauzi",
    "kelas": "XII RPL 1",
    "nisn": "0051234567",
    "foto": "https://...",
    "talenta": ["Robotik", "Pemrograman Web"],
    "deskripsi": "Juara 1 LKS RPL...",
    "profil_doc": [
      {
        "id": 1,
        "file_name": "sertifikat.pdf",
        "file_type": "pdf",
        "file_url": "/uploads/1234-sertifikat.pdf",
        "server_filename": "1234-sertifikat.pdf"
      }
    ]
  }
]
```

**cURL:**
```bash
curl http://localhost:3000/api/students
```

---

#### `GET /api/students/:id`

Ambil detail satu siswa.

**Response 200:** (sama dengan format di atas, satu objek)

**Response 404:**
```json
{ "error": "Siswa tidak ditemukan." }
```

---

#### `POST /api/students` 🔒

Tambah siswa baru.

**Request Body:**
```json
{
  "nama": "Siti Nurhaliza",
  "nisn": "0068765432",
  "kelas": "XI TKJ 2",
  "foto": "https://example.com/foto.jpg",
  "talenta": ["Jaringan", "Cyber Security"],
  "deskripsi": "Administrator jaringan andal."
}
```

**Response 201:** Objek siswa yang baru dibuat.

**cURL:**
```bash
curl -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "nama": "Siti Nurhaliza",
    "nisn": "0068765432",
    "kelas": "XI TKJ 2",
    "talenta": ["Jaringan", "Cyber Security"],
    "deskripsi": "Administrator jaringan andal."
  }'
```

---

#### `PUT /api/students/:id` 🔒

Edit data siswa. Hanya field yang dikirim yang akan diubah.

**Request Body:**
```json
{
  "nama": "Siti Nurhaliza Updated",
  "talenta": ["Jaringan", "Cloud Computing"]
}
```

**Response 200:** Objek siswa yang sudah diperbarui.

**cURL:**
```bash
curl -X PUT http://localhost:3000/api/students/std-a1b2c3d4 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"nama": "Siti Updated"}'
```

---

#### `DELETE /api/students/:id` 🔒

Hapus siswa beserta semua dokumen terkait.

**Response 200:**
```json
{ "message": "Siswa dan semua dokumennya berhasil dihapus." }
```

**cURL:**
```bash
curl -X DELETE http://localhost:3000/api/students/std-a1b2c3d4 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Documents — Dokumen Portofolio

#### `POST /api/upload-doc` 🔒

Upload dokumen ke profil siswa. Menggunakan `multipart/form-data`.

**Form Fields:**
| Field | Type | Keterangan |
| :--- | :--- | :--- |
| `file` | File | File yang diunggah (PDF, DOC, DOCX, JPG, PNG) |
| `studentId` | String | ID siswa pemilik dokumen |

**Response 200:**
```json
{
  "message": "File berhasil diunggah.",
  "doc": {
    "id": 5,
    "student_id": "std-a1b2c3d4",
    "file_name": "sertifikat.pdf",
    "file_type": "pdf",
    "file_url": "/uploads/1723...-sertifikat.pdf",
    "server_filename": "1723...-sertifikat.pdf"
  }
}
```

**Response 413:**
```json
{ "error": "Ukuran file terlalu besar. Maksimal 10MB." }
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/upload-doc \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/sertifikat.pdf" \
  -F "studentId=std-a1b2c3d4"
```

---

#### `DELETE /api/delete-doc/:studentId/:fileName` 🔒

Hapus dokumen tertentu.

**Response 200:**
```json
{ "message": "Dokumen berhasil dihapus." }
```

**cURL:**
```bash
curl -X DELETE "http://localhost:3000/api/delete-doc/std-a1b2c3d4/sertifikat.pdf" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

#### `PUT /api/rename-doc` 🔒

Ganti nama dokumen.

**Request Body:**
```json
{
  "studentId": "std-a1b2c3d4",
  "oldName": "sertifikat.pdf",
  "newName": "Sertifikat LKS 2026.pdf"
}
```

**Response 200:**
```json
{
  "message": "Nama dokumen diperbarui.",
  "doc": { ... }
}
```

---

### 4. Health Check

#### `GET /api/health`

Status server dan koneksi database.

**Response 200:**
```json
{
  "status": "ok",
  "app": "ITAKA",
  "version": "1.0.0",
  "timestamp": "2026-08-16T06:00:00.000Z",
  "storage": {
    "mode": "sqlite",
    "is_vercel": false,
    "sqlite": "tersedia",
    "baserow": {
      "connected": false,
      "reason": "Baserow tidak dikonfigurasi"
    }
  }
}
```

---

## 📋 Kode Error

| HTTP Code | Keterangan |
| :--- | :--- |
| `200` | OK — Request berhasil |
| `201` | Created — Data berhasil dibuat |
| `400` | Bad Request — Parameter tidak lengkap atau tidak valid |
| `401` | Unauthorized — Token tidak ada atau invalid |
| `403` | Forbidden — Token expired atau role tidak sesuai |
| `404` | Not Found — Data tidak ditemukan |
| `413` | Payload Too Large — File melebihi batas ukuran |
| `500` | Internal Server Error — Kesalahan server |

---

## 📌 Catatan

- Semua response dalam format **JSON**.
- Endpoint upload menggunakan **multipart/form-data**, bukan JSON.
- File yang diizinkan: `.pdf`, `.doc`, `.docx`, `.jpg`, `.jpeg`, `.png` (maks 10MB).
- Token JWT berlaku sesuai konfigurasi `JWT_EXPIRES_IN` (default: 8 jam).
