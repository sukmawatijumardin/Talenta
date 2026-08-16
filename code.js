const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Konfigurasi Direktori Unggahan (Uploads)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi Multer untuk penyimpanan file fisik yang aman
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Nama file aman tanpa spasi dan karakter aneh
        const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, safeName);
    }
});
const upload = multer({ storage: storage });

// Menyajikan file statis dengan memaksa agar BISA DIBUKA DI BROWSER (inline)
app.use('/uploads', express.static(uploadDir, {
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        // Paksa browser untuk menampilkan (inline) bukan mengunduh langsung
        if (ext === '.pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline'); 
        } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
            res.setHeader('Content-Disposition', 'inline');
        } else {
            res.setHeader('Content-Disposition', 'attachment'); // Selain itu unduh (misal Word)
        }
    }
}));

// ==========================================
// MOCK DATABASE DALAM MEMORI (Sementara)
// ==========================================
let students = [
    {
        id: "std-001",
        nama: "Ahmad Fauzi",
        kelas: "XII RPL 1",
        nisn: "0051234567",
        foto: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
        talenta: ["Robotik", "Pemrograman Web", "UI/UX Design"],
        deskripsi: "Juara 1 LKS Rekayasa Perangkat Lunak 2026 SMKN 1 Parepare.",
        profil_doc: []
    }
];

// ==========================================
// REST API ROUTES
// ==========================================

// 1. Ambil Semua Data Siswa
app.get('/api/students', (req, res) => {
    res.json(students);
});

// 2. Tambah Data Siswa
app.post('/api/students', (req, res) => {
    const newStudent = {
        id: 'std-' + Date.now(),
        nama: req.body.nama,
        nisn: req.body.nisn,
        kelas: req.body.kelas,
        deskripsi: req.body.deskripsi,
        foto: req.body.foto || "https://placehold.co/150x150/1c1917/f97316?text=Foto",
        talenta: req.body.talenta || [],
        profil_doc: []
    };
    students.unshift(newStudent);
    res.status(201).json(newStudent);
});

// 3. Edit Data Siswa
app.put('/api/students/:id', (req, res) => {
    const id = req.params.id;
    const index = students.findIndex(s => s.id === id);
    
    if (index !== -1) {
        students[index] = { ...students[index], ...req.body };
        res.json(students[index]);
    } else {
        res.status(404).json({ error: "Siswa tidak ditemukan" });
    }
});

// 4. Hapus Data Siswa beserta file-filenya
app.delete('/api/students/:id', (req, res) => {
    const id = req.params.id;
    const index = students.findIndex(s => s.id === id);
    
    if (index !== -1) {
        // Hapus juga file fisik yang terkait dengan siswa tersebut
        const docs = students[index].profil_doc || [];
        docs.forEach(doc => {
            if (doc.server_filename) {
                const filePath = path.join(uploadDir, doc.server_filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        });
        
        students = students.filter(s => s.id !== id);
        res.json({ message: "Siswa berhasil dihapus" });
    } else {
        res.status(404).json({ error: "Siswa tidak ditemukan" });
    }
});

// 5. Unggah Dokumen ke Profil Siswa (Mendukung Multi-file)
app.post('/api/upload-doc', upload.single('file'), (req, res) => {
    const studentId = req.body.studentId;
    const file = req.file;

    if (!file || !studentId) {
        return res.status(400).json({ error: "File atau ID Siswa tidak valid" });
    }

    const studentIndex = students.findIndex(s => s.id === studentId);
    if (studentIndex === -1) {
        // Hapus file yang terlanjur terunggah jika siswa tidak ada
        fs.unlinkSync(file.path);
        return res.status(404).json({ error: "Siswa tidak ditemukan" });
    }

    const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
    
    const newDoc = {
        file_name: file.originalname,
        file_type: ext,
        file_url: `http://localhost:${PORT}/uploads/${file.filename}`,
        server_filename: file.filename
    };

    if (!students[studentIndex].profil_doc) {
        students[studentIndex].profil_doc = [];
    }
    
    students[studentIndex].profil_doc.push(newDoc);
    res.json({ message: "File berhasil diunggah", doc: newDoc });
});

// 6. Hapus Dokumen Tertentu
app.delete('/api/delete-doc/:studentId/:fileName', (req, res) => {
    const { studentId, fileName } = req.params;
    
    const studentIndex = students.findIndex(s => s.id === studentId);
    if (studentIndex === -1) return res.status(404).json({ error: "Siswa tidak ditemukan" });

    const docList = students[studentIndex].profil_doc || [];
    const docIndex = docList.findIndex(d => d.file_name === fileName);
    
    if (docIndex !== -1) {
        // Hapus fisik file jika ada di server
        try {
            const serverFile = docList[docIndex].server_filename;
            if (serverFile) {
                const filePath = path.join(uploadDir, serverFile);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        } catch (err) {
            console.log("File fisik tidak ditemukan, hapus dari database saja.");
        }

        // Hapus dari array database
        students[studentIndex].profil_doc.splice(docIndex, 1);
        res.json({ message: "Dokumen terhapus" });
    } else {
        res.status(404).json({ error: "Dokumen tidak ditemukan" });
    }
});

// 7. Ganti Nama Dokumen
app.put('/api/rename-doc', (req, res) => {
    const { studentId, oldName, newName } = req.body;
    
    const studentIndex = students.findIndex(s => s.id === studentId);
    if (studentIndex === -1) return res.status(404).json({ error: "Siswa tidak ditemukan" });

    const docList = students[studentIndex].profil_doc || [];
    const docIndex = docList.findIndex(d => d.file_name === oldName);

    if (docIndex !== -1) {
        students[studentIndex].profil_doc[docIndex].file_name = newName;
        res.json({ message: "Nama dokumen diperbarui", doc: students[studentIndex].profil_doc[docIndex] });
    } else {
        res.status(404).json({ error: "Dokumen tidak ditemukan" });
    }
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📂 Menyajikan file unggahan dari direktori: ${uploadDir}`);
    console.log(`📡 URL API tersedia di: http://localhost:${PORT}/api/...`);
});