/**
 * ITAKA — Routes: Students (CRUD)
 * 
 * Menggunakan storage adapter (otomatis SQLite atau Baserow).
 * Operasi tulis dilindungi JWT (guru only).
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const storage = require('../config/storage');
const { requireGuru } = require('../middleware/auth');
const { uploadDir } = require('../middleware/upload');

/**
 * GET /api/students
 * Ambil semua data siswa (publik)
 */
router.get('/', async (req, res) => {
    try {
        const students = await storage.getAllStudents();
        res.json(students);
    } catch (error) {
        console.error('❌ Error mengambil data siswa:', error.message);
        res.status(500).json({ error: 'Gagal mengambil data siswa.' });
    }
});

/**
 * GET /api/students/:id
 * Ambil detail satu siswa
 */
router.get('/:id', async (req, res) => {
    try {
        const student = await storage.getStudentById(req.params.id);
        if (!student) {
            return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
        }
        res.json(student);
    } catch (error) {
        console.error('❌ Error mengambil detail siswa:', error.message);
        res.status(500).json({ error: 'Gagal mengambil data siswa.' });
    }
});

/**
 * POST /api/students
 * Tambah data siswa baru (guru only)
 */
router.post('/', requireGuru, async (req, res) => {
    try {
        const { nama, nisn, kelas, foto, deskripsi, talenta } = req.body;

        if (!nama || !nisn || !kelas) {
            return res.status(400).json({ error: 'Nama, NISN, dan Kelas wajib diisi.' });
        }

        const id = 'std-' + uuidv4().split('-')[0];
        const fotoUrl = foto || 'https://placehold.co/150x150/1c1917/f97316?text=Foto';

        const newStudent = await storage.createStudent({
            id, nama, kelas, nisn,
            foto: fotoUrl,
            talenta: talenta || [],
            deskripsi: deskripsi || ''
        });

        res.status(201).json(newStudent);
    } catch (error) {
        console.error('❌ Error menambah siswa:', error.message);
        res.status(500).json({ error: 'Gagal menambah data siswa.' });
    }
});

/**
 * PUT /api/students/:id
 * Edit data siswa (guru only)
 */
router.put('/:id', requireGuru, async (req, res) => {
    try {
        const updated = await storage.updateStudent(req.params.id, req.body);

        if (!updated) {
            return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
        }

        res.json(updated);
    } catch (error) {
        console.error('❌ Error mengedit siswa:', error.message);
        res.status(500).json({ error: 'Gagal mengedit data siswa.' });
    }
});

/**
 * DELETE /api/students/:id
 * Hapus siswa beserta semua dokumen terkait (guru only)
 */
router.delete('/:id', requireGuru, async (req, res) => {
    try {
        const result = await storage.deleteStudent(req.params.id);

        if (!result) {
            return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
        }

        // Hapus file fisik dokumen (hanya berlaku di lokal, bukan Vercel)
        if (!storage.IS_VERCEL && result.docs) {
            result.docs.forEach(doc => {
                if (doc.server_filename) {
                    const filePath = path.join(uploadDir, doc.server_filename);
                    try {
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    } catch (err) {
                        console.warn(`⚠️ Gagal hapus file ${filePath}:`, err.message);
                    }
                }
            });
        }

        res.json({ message: 'Siswa dan semua dokumennya berhasil dihapus.' });
    } catch (error) {
        console.error('❌ Error menghapus siswa:', error.message);
        res.status(500).json({ error: 'Gagal menghapus data siswa.' });
    }
});

module.exports = router;
