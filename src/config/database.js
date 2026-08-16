/**
 * ITAKA — Database Lokal (JSON File Store)
 * 
 * Penyimpanan data lokal berbasis file JSON — ringan, tanpa kompilasi,
 * bekerja di semua OS tanpa build tools tambahan.
 * 
 * File database: data/itaka-db.json
 * 
 * Struktur:
 * {
 *   students: [ { id, nama, kelas, nisn, foto, talenta, deskripsi, created_at, updated_at } ],
 *   documents: [ { id, student_id, file_name, file_type, file_url, server_filename, uploaded_at } ]
 * }
 */

const fs = require('fs');
const path = require('path');

// Pastikan direktori data ada
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(dataDir, 'itaka-db.json');

// Skema default
const DEFAULT_DB = {
    students: [],
    documents: [],
    _meta: { version: 1, created_at: new Date().toISOString() }
};

/**
 * Membaca database dari file JSON
 */
function readDB() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const raw = fs.readFileSync(DB_PATH, 'utf8');
            const data = JSON.parse(raw);
            // Pastikan struktur lengkap
            return {
                students: data.students || [],
                documents: data.documents || [],
                _meta: data._meta || DEFAULT_DB._meta
            };
        }
    } catch (err) {
        console.warn('⚠️ Gagal membaca database, membuat yang baru:', err.message);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DB));
}

/**
 * Menulis database ke file JSON (atomic write)
 */
function writeDB(data) {
    const tmpPath = DB_PATH + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, DB_PATH);
}

/**
 * Inisialisasi database — buat file jika belum ada & seed data awal
 */
function initDatabase() {
    let data = readDB();

    if (data.students.length === 0) {
        data.students.push({
            id: 'std-001',
            nama: 'Ahmad Fauzi',
            kelas: 'XII RPL 1',
            nisn: '0051234567',
            foto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
            talenta: ['Robotik', 'Pemrograman Web', 'UI/UX Design'],
            deskripsi: 'Juara 1 LKS Rekayasa Perangkat Lunak 2026 SMKN 1 Parepare.',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        writeDB(data);
        console.log('📦 Data awal siswa berhasil ditambahkan ke database.');
    }

    return data;
}

// ==========================================
// Query Functions (kompatibel dengan storage.js)
// ==========================================

const queries = {
    // --- Students ---
    getAllStudents() {
        const data = readDB();
        return data.students.sort((a, b) => 
            new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
    },

    getStudentById(id) {
        const data = readDB();
        return data.students.find(s => s.id === id) || null;
    },

    insertStudent(id, nama, kelas, nisn, foto, talentaJson, deskripsi) {
        const data = readDB();
        const talenta = typeof talentaJson === 'string' ? JSON.parse(talentaJson) : talentaJson;
        
        data.students.unshift({
            id, nama, kelas, nisn, foto,
            talenta: talenta || [],
            deskripsi: deskripsi || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        writeDB(data);
    },

    updateStudent(nama, kelas, nisn, foto, talentaJson, deskripsi, id) {
        const data = readDB();
        const idx = data.students.findIndex(s => s.id === id);
        if (idx === -1) return;

        const talenta = typeof talentaJson === 'string' ? JSON.parse(talentaJson) : talentaJson;

        data.students[idx] = {
            ...data.students[idx],
            nama, kelas, nisn, foto,
            talenta: talenta || data.students[idx].talenta,
            deskripsi: deskripsi !== undefined ? deskripsi : data.students[idx].deskripsi,
            updated_at: new Date().toISOString()
        };

        writeDB(data);
    },

    deleteStudent(id) {
        const data = readDB();
        data.students = data.students.filter(s => s.id !== id);
        writeDB(data);
    },

    // --- Documents ---
    getDocsByStudentId(studentId) {
        const data = readDB();
        return data.documents.filter(d => d.student_id === studentId);
    },

    getDocByFileName(studentId, fileName) {
        const data = readDB();
        return data.documents.find(d => d.student_id === studentId && d.file_name === fileName) || null;
    },

    insertDoc(student_id, file_name, file_type, file_url, server_filename) {
        const data = readDB();
        const newId = data.documents.length > 0 
            ? Math.max(...data.documents.map(d => d.id || 0)) + 1 
            : 1;

        const doc = {
            id: newId,
            student_id, file_name, file_type, file_url, server_filename,
            uploaded_at: new Date().toISOString()
        };

        data.documents.push(doc);
        writeDB(data);

        return { lastInsertRowid: newId };
    },

    deleteDocByFileName(studentId, fileName) {
        const data = readDB();
        data.documents = data.documents.filter(
            d => !(d.student_id === studentId && d.file_name === fileName)
        );
        writeDB(data);
    },

    deleteDocsByStudentId(studentId) {
        const data = readDB();
        data.documents = data.documents.filter(d => d.student_id !== studentId);
        writeDB(data);
    },

    renameDoc(newName, studentId, oldName) {
        const data = readDB();
        const doc = data.documents.find(d => d.student_id === studentId && d.file_name === oldName);
        if (doc) {
            doc.file_name = newName;
            writeDB(data);
        }
    }
};

// ==========================================
// Helper Functions (kompatibel dengan storage.js)
// ==========================================

function getAllStudentsWithDocs() {
    const students = queries.getAllStudents();
    return students.map(s => ({
        ...s,
        talenta: Array.isArray(s.talenta) ? s.talenta : [],
        profil_doc: queries.getDocsByStudentId(s.id)
    }));
}

function getStudentWithDocs(id) {
    const student = queries.getStudentById(id);
    if (!student) return null;
    return {
        ...student,
        talenta: Array.isArray(student.talenta) ? student.talenta : [],
        profil_doc: queries.getDocsByStudentId(student.id)
    };
}

// Jalankan inisialisasi jika dieksekusi langsung
if (require.main === module) {
    initDatabase();
    console.log('✅ Database berhasil diinisialisasi di:', DB_PATH);
    process.exit(0);
}

module.exports = {
    queries,
    initDatabase,
    getAllStudentsWithDocs,
    getStudentWithDocs,
    DB_PATH,
    readDB,
    writeDB
};
