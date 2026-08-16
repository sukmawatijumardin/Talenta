/**
 * ITAKA — Middleware Autentikasi JWT
 * 
 * Mengelola login guru via kode akses dan melindungi
 * endpoint sensitif dengan JWT token.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'itaka-default-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Daftar kode akses guru dari environment variable
 */
function getGuruCodes() {
    const codes = process.env.GURU_CODES || '123456';
    return codes.split(',').map(c => c.trim()).filter(Boolean);
}

/**
 * Membuat JWT token untuk guru yang terverifikasi
 */
function generateToken(role) {
    return jwt.sign(
        { role, iat: Math.floor(Date.now() / 1000) },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Memverifikasi JWT token dari header Authorization
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Middleware: Proteksi endpoint — hanya guru yang terautentikasi
 * Header yang diharapkan: Authorization: Bearer <token>
 */
function requireGuru(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            error: 'Akses ditolak. Token autentikasi diperlukan.',
            code: 'NO_TOKEN'
        });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'guru') {
        return res.status(403).json({ 
            error: 'Token tidak valid atau sudah kedaluwarsa.',
            code: 'INVALID_TOKEN'
        });
    }

    req.user = decoded;
    next();
}

/**
 * Middleware: Opsional — cek apakah request dari guru (tidak block jika bukan)
 */
function optionalGuru(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (decoded && decoded.role === 'guru') {
            req.user = decoded;
        }
    }

    next();
}

module.exports = {
    getGuruCodes,
    generateToken,
    verifyToken,
    requireGuru,
    optionalGuru,
    JWT_SECRET
};
