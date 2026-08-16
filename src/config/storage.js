/**
 * ITAKA — Storage Adapter
 * 
 * Lapisan abstraksi yang memilih backend penyimpanan secara otomatis:
 * 
 * ┌─────────────────────────────────────────────────────┐
 * │  Environment        │  Primary DB   │  Sync Target  │
 * ├─────────────────────┼───────────────┼───────────────┤
 * │  Lokal (dev)        │  JSON File    │  Baserow (opt)│
 * │  Vercel (production)│  Baserow      │  —            │
 * └─────────────────────────────────────────────────────┘
 */

const IS_VERCEL = !!process.env.VERCEL;

let localDbAvailable = false;
let db = null;

// Coba muat local database (JSON file store)
if (!IS_VERCEL) {
    try {
        const database = require('./database');
        database.initDatabase();
        db = database;
        localDbAvailable = true;
    } catch (err) {
        console.warn('⚠️ Local DB tidak tersedia:', err.message);
    }
}

const baserow = require('./baserow');

/**
 * Tentukan mode penyimpanan
 */
function getMode() {
    if (IS_VERCEL) {
        if (baserow.isEnabled()) return 'baserow';
        return 'none';
    }
    if (localDbAvailable) return 'local';
    if (baserow.isEnabled()) return 'baserow';
    return 'none';
}

const MODE = getMode();

// ==========================================
// STUDENT Operations
// ==========================================

async function getAllStudents() {
    if (MODE === 'baserow') {
        return await baserow.getAllStudents();
    }
    if (MODE === 'local') {
        return db.getAllStudentsWithDocs();
    }
    return [];
}

async function getStudentById(id) {
    if (MODE === 'baserow') {
        return await baserow.getStudentById(id);
    }
    if (MODE === 'local') {
        return db.getStudentWithDocs(id);
    }
    return null;
}

async function getStudentByIdRaw(id) {
    if (MODE === 'baserow') {
        return await baserow.getStudentById(id);
    }
    if (MODE === 'local') {
        return db.queries.getStudentById(id);
    }
    return null;
}

async function createStudent(studentData) {
    const { id, nama, kelas, nisn, foto, talenta, deskripsi } = studentData;
    const talentaArr = Array.isArray(talenta) ? talenta : [];

    if (MODE === 'local') {
        db.queries.insertStudent(id, nama, kelas, nisn, foto || '', JSON.stringify(talentaArr), deskripsi || '');

        // Async sync ke Baserow (non-blocking)
        if (baserow.isEnabled()) {
            baserow.createStudent({ id, nama, kelas, nisn, foto, talenta: talentaArr, deskripsi }).catch(e =>
                console.warn('⚠️ Baserow sync create gagal:', e.message)
            );
        }

        return db.getStudentWithDocs(id);
    }

    if (MODE === 'baserow') {
        const result = await baserow.createStudent({ id, nama, kelas, nisn, foto, talenta: talentaArr, deskripsi });
        return result || { id, nama, kelas, nisn, foto, talenta: talentaArr, deskripsi, profil_doc: [] };
    }

    return null;
}

async function updateStudent(id, updateData) {
    if (MODE === 'local') {
        const existing = db.queries.getStudentById(id);
        if (!existing) return null;

        const nama = updateData.nama || existing.nama;
        const kelas = updateData.kelas || existing.kelas;
        const nisn = updateData.nisn || existing.nisn;
        const foto = updateData.foto || existing.foto;
        const deskripsi = updateData.deskripsi !== undefined ? updateData.deskripsi : existing.deskripsi;
        const talenta = updateData.talenta ? JSON.stringify(updateData.talenta) : JSON.stringify(existing.talenta || []);

        db.queries.updateStudent(nama, kelas, nisn, foto, talenta, deskripsi, id);

        const updated = db.getStudentWithDocs(id);

        if (baserow.isEnabled()) {
            baserow.updateStudent(updated).catch(e =>
                console.warn('⚠️ Baserow sync update gagal:', e.message)
            );
        }

        return updated;
    }

    if (MODE === 'baserow') {
        const existing = await baserow.getStudentById(id);
        if (!existing) return null;

        const merged = { ...existing, ...updateData, id };
        return await baserow.updateStudent(merged);
    }

    return null;
}

async function deleteStudent(id) {
    if (MODE === 'local') {
        const existing = db.queries.getStudentById(id);
        if (!existing) return false;

        const docs = db.queries.getDocsByStudentId(id);
        db.queries.deleteDocsByStudentId(id);
        db.queries.deleteStudent(id);

        if (baserow.isEnabled()) {
            baserow.deleteStudent(id).catch(e =>
                console.warn('⚠️ Baserow sync delete gagal:', e.message)
            );
        }

        return { deleted: true, docs };
    }

    if (MODE === 'baserow') {
        const existing = await baserow.getStudentById(id);
        if (!existing) return false;

        await baserow.deleteStudent(id);
        return { deleted: true, docs: existing.profil_doc || [] };
    }

    return false;
}

// ==========================================
// DOCUMENT Operations
// ==========================================

async function createDocument(docData) {
    const { student_id, file_name, file_type, file_url, server_filename } = docData;

    if (MODE === 'local') {
        const result = db.queries.insertDoc(student_id, file_name, file_type, file_url, server_filename);

        if (baserow.isEnabled()) {
            baserow.createDocument(docData).catch(e =>
                console.warn('⚠️ Baserow sync doc create gagal:', e.message)
            );
        }

        return { id: result.lastInsertRowid, ...docData };
    }

    if (MODE === 'baserow') {
        const result = await baserow.createDocument(docData);
        return result || docData;
    }

    return docData;
}

async function getDocByFileName(studentId, fileName) {
    if (MODE === 'local') {
        return db.queries.getDocByFileName(studentId, fileName);
    }
    if (MODE === 'baserow') {
        const docs = await baserow._getDocsForStudent(studentId);
        return docs.find(d => d.file_name === fileName) || null;
    }
    return null;
}

async function deleteDocument(studentId, fileName) {
    if (MODE === 'local') {
        const doc = db.queries.getDocByFileName(studentId, fileName);
        if (!doc) return null;

        db.queries.deleteDocByFileName(studentId, fileName);

        if (baserow.isEnabled()) {
            baserow.deleteDocument(studentId, fileName).catch(e =>
                console.warn('⚠️ Baserow sync doc delete gagal:', e.message)
            );
        }

        return doc;
    }

    if (MODE === 'baserow') {
        const docs = await baserow._getDocsForStudent(studentId);
        const doc = docs.find(d => d.file_name === fileName);
        if (!doc) return null;

        await baserow.deleteDocument(studentId, fileName);
        return doc;
    }

    return null;
}

async function renameDocument(studentId, oldName, newName) {
    if (MODE === 'local') {
        const doc = db.queries.getDocByFileName(studentId, oldName);
        if (!doc) return null;

        db.queries.renameDoc(newName, studentId, oldName);
        return db.queries.getDocByFileName(studentId, newName);
    }

    return null;
}

// ==========================================
// Info
// ==========================================

async function getStorageInfo() {
    const brStatus = await baserow.testConnection();
    return {
        mode: MODE,
        is_vercel: IS_VERCEL,
        local_db: localDbAvailable ? 'tersedia' : 'tidak tersedia',
        baserow: brStatus
    };
}

module.exports = {
    MODE,
    IS_VERCEL,
    getAllStudents,
    getStudentById,
    getStudentByIdRaw,
    createStudent,
    updateStudent,
    deleteStudent,
    createDocument,
    getDocByFileName,
    deleteDocument,
    renameDocument,
    getStorageInfo
};
