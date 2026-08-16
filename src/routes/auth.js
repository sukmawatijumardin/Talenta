/**
 * ITAKA — Routes: Autentikasi
 * 
 * Endpoint untuk login guru, verifikasi token, dan logout.
 */

const express = require('express');
const router = express.Router();
const { getGuruCodes, generateToken, requireGuru } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Verifikasi kode akses guru dan kembalikan JWT token
 */
router.post('/login', (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Kode akses diperlukan.' });
    }

    const validCodes = getGuruCodes();

    if (validCodes.includes(code.trim())) {
        const token = generateToken('guru');
        return res.json({
            message: 'Login berhasil!',
            role: 'guru',
            token: token
        });
    }

    return res.status(401).json({ 
        error: 'Kode akses salah atau tidak terdaftar.',
        code: 'INVALID_CODE'
    });
});

/**
 * GET /api/auth/verify
 * Cek apakah token masih valid
 */
router.get('/verify', requireGuru, (req, res) => {
    res.json({
        valid: true,
        role: req.user.role,
        message: 'Token valid.'
    });
});

/**
 * POST /api/auth/logout
 * Logout (client-side: hapus token dari localStorage)
 * Endpoint ini hanya sebagai konfirmasi
 */
router.post('/logout', (req, res) => {
    res.json({ message: 'Logout berhasil. Hapus token dari sisi klien.' });
});

module.exports = router;
