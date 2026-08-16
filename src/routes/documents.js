/**
 * ITAKA — Routes: Documents
 * 
 * Upload, hapus, dan rename dokumen portofolio siswa.
 * Menggunakan storage adapter (SQLite / Baserow otomatis).
 * Semua endpoint dilindungi JWT (guru only).
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const storage = require('../config/storage');
const { requireGuru } = require('../middleware/auth');
const { upload, uploadDir, handleUploadError } = require('../middleware/upload');

/**
 * POST /api/upload-doc
 * Unggah dokumen ke profil siswa (guru only)
 */
router.post('/upload-doc', requireGuru, upload.single('file'), handleUploadError, async (req, res) => {
    const studentId = req.body.studentId;
    const file = req.file;

    if (!file || !studentId) {
        return res.status(400).json({ error: 'File atau ID Siswa tidak valid.' });
    }

    // Verifikasi siswa ada
    const student = await storage.getStudentByIdRaw(studentId);
    if (!student) {
        try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
        return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }

    try {
        const ext = path.extname(file.originalname).replace('.', '').toLowerCase();

        const newDoc = {
            student_id: studentId,
            file_name: file.originalname,
            file_type: ext,
            file_url: `/uploads/${file.filename}`,
            server_filename: file.filename
        };

        const savedDoc = await storage.createDocument(newDoc);

        res.json({ message: 'File berhasil diunggah.', doc: savedDoc });
    } catch (error) {
        console.error('❌ Error upload dokumen:', error.message);
        res.status(500).json({ error: 'Gagal menyimpan dokumen.' });
    }
});

/**
 * DELETE /api/delete-doc/:studentId/:fileName
 * Hapus dokumen tertentu dari profil siswa (guru only)
 */
router.delete('/delete-doc/:studentId/:fileName', requireGuru, async (req, res) => {
    const { studentId, fileName } = req.params;
    const decodedFileName = decodeURIComponent(fileName);

    try {
        const deletedDoc = await storage.deleteDocument(studentId, decodedFileName);

        if (!deletedDoc) {
            return res.status(404).json({ error: 'Dokumen tidak ditemukan.' });
        }

        // Hapus file fisik (lokal only)
        if (!storage.IS_VERCEL && deletedDoc.server_filename) {
            const filePath = path.join(uploadDir, deletedDoc.server_filename);
            try {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch (err) {
                console.warn('⚠️ File fisik tidak ditemukan, sudah dihapus dari database.');
            }
        }

        res.json({ message: 'Dokumen berhasil dihapus.' });
    } catch (error) {
        console.error('❌ Error hapus dokumen:', error.message);
        res.status(500).json({ error: 'Gagal menghapus dokumen.' });
    }
});

/**
 * PUT /api/rename-doc
 * Ganti nama dokumen (guru only)
 */
router.put('/rename-doc', requireGuru, async (req, res) => {
    const { studentId, oldName, newName } = req.body;

    if (!studentId || !oldName || !newName) {
        return res.status(400).json({ error: 'studentId, oldName, dan newName wajib diisi.' });
    }

    try {
        const updatedDoc = await storage.renameDocument(studentId, oldName, newName);

        if (!updatedDoc) {
            return res.status(404).json({ error: 'Dokumen tidak ditemukan.' });
        }

        res.json({ message: 'Nama dokumen diperbarui.', doc: updatedDoc });
    } catch (error) {
        console.error('❌ Error rename dokumen:', error.message);
        res.status(500).json({ error: 'Gagal mengubah nama dokumen.' });
    }
});

module.exports = router;
