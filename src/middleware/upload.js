/**
 * ITAKA — Middleware Upload File (Multer Hardened)
 * 
 * Konfigurasi Multer dengan:
 * - Whitelist ekstensi file (.pdf, .doc, .docx, .jpg, .jpeg, .png)
 * - Batas ukuran file (default: 10MB)
 * - Penamaan file yang aman (tanpa karakter aneh)
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Direktori penyimpanan upload
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Ekstensi file yang diizinkan
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

// MIME types yang diizinkan
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
];

// Batas ukuran file dari environment (default 10MB)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

/**
 * Konfigurasi penyimpanan disk Multer
 */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Bersihkan nama file dari karakter berbahaya
        const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, safeName);
    }
});

/**
 * Filter file — hanya izinkan ekstensi dan MIME type yang terdaftar
 */
function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return cb(new Error(`Tipe file "${ext}" tidak diizinkan. Tipe yang didukung: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error(`MIME type "${file.mimetype}" tidak diizinkan.`), false);
    }

    cb(null, true);
}

/**
 * Instance Multer yang sudah dikonfigurasi
 */
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1 // Satu file per request
    }
});

/**
 * Middleware error handler khusus Multer
 */
function handleUploadError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                error: `Ukuran file terlalu besar. Maksimal ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB.`
            });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    
    if (err) {
        return res.status(400).json({ error: err.message });
    }
    
    next();
}

module.exports = {
    upload,
    uploadDir,
    handleUploadError,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE
};
