/**
 * ITAKA — Server Entry Point
 * 
 * Inspirasi Talenta dan Kompetensi Anak
 * Backend Express.js dengan Storage Adapter (SQLite ↔ Baserow)
 * 
 * Deployment targets:
 *   - Lokal: node server.js (SQLite + Baserow opsional)
 *   - Vercel: api/index.js wraps this module (Baserow wajib)
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import storage adapter (otomatis pilih SQLite / Baserow)
const storage = require('./src/config/storage');

// Import routes
const authRoutes = require('./src/routes/auth');
const studentRoutes = require('./src/routes/students');
const documentRoutes = require('./src/routes/documents');

// Import middleware
const { uploadDir } = require('./src/middleware/upload');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ==========================================
// Middleware Global
// ==========================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Menyajikan frontend statis
app.use(express.static(path.join(__dirname, 'public')));

// Menyajikan file unggahan dengan header yang tepat
app.use('/uploads', express.static(uploadDir, {
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
        } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
            res.setHeader('Content-Disposition', 'inline');
        } else {
            res.setHeader('Content-Disposition', 'attachment');
        }
    }
}));

// ==========================================
// API Routes
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api', documentRoutes);

// ==========================================
// Health Check & Info
// ==========================================
app.get('/api/health', async (req, res) => {
    const info = await storage.getStorageInfo();
    
    res.json({
        status: 'ok',
        app: 'ITAKA',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        storage: info
    });
});

// ==========================================
// Fallback — Serve frontend
// ==========================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// Error Handler Global
// ==========================================
app.use((err, req, res, next) => {
    console.error('💥 Unhandled Error:', err.message);
    res.status(500).json({ error: 'Terjadi kesalahan internal server.' });
});

// ==========================================
// Start Server (hanya jika dijalankan langsung, bukan di Vercel)
// ==========================================
if (!process.env.VERCEL) {
    app.listen(PORT, HOST, async () => {
        console.log('');
        console.log('  ╔══════════════════════════════════════════════╗');
        console.log('  ║   🎓 ITAKA — Server Berjalan!                ║');
        console.log('  ╠══════════════════════════════════════════════╣');
        console.log(`  ║   🌐 URL    : http://localhost:${PORT}            ║`);
        console.log(`  ║   📡 API    : http://localhost:${PORT}/api        ║`);
        console.log(`  ║   📂 Upload : ${uploadDir}`);
        console.log(`  ║   💾 Mode   : ${storage.MODE.toUpperCase()}`);
        console.log('  ╚══════════════════════════════════════════════╝');
        console.log('');

        const info = await storage.getStorageInfo();
        if (info.baserow.connected) {
            console.log('  ✅ Baserow: Terhubung dan sinkronisasi aktif');
        } else {
            console.log(`  ⚠️  Baserow: ${info.baserow.reason}`);
            if (storage.MODE === 'sqlite') {
                console.log('     → Berjalan dengan SQLite saja (offline mode)');
            }
        }
        console.log('');
    });
}

// Export untuk Vercel serverless function
module.exports = app;
