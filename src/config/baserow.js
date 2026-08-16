/**
 * ITAKA — Baserow API Client (Full CRUD)
 * 
 * Pada deployment Vercel, Baserow menjadi database UTAMA (bukan hanya sync).
 * Pada lokal, Baserow bersifat opsional sebagai dual-write sync.
 * 
 * Jika variabel BASEROW_URL dan BASEROW_TOKEN tidak diset,
 * semua operasi akan dilewati (no-op) tanpa error.
 */

const fetch = require('node-fetch');

class BaserowClient {
    constructor() {
        this.baseUrl = (process.env.BASEROW_URL || '').replace(/\/+$/, '');
        this.token = process.env.BASEROW_TOKEN || '';
        this.studentsTableId = process.env.BASEROW_TABLE_STUDENTS_ID || '';
        this.documentsTableId = process.env.BASEROW_TABLE_DOCUMENTS_ID || '';
        
        this.enabled = !!(this.baseUrl && this.token && this.studentsTableId);
    }

    /**
     * Cek apakah Baserow aktif dan terkonfigurasi
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Helper untuk request ke Baserow API
     */
    async _request(method, endpoint, body = null) {
        if (!this.enabled) return null;

        const url = `${this.baseUrl}/api${endpoint}`;
        const options = {
            method,
            headers: {
                'Authorization': `Token ${this.token}`,
                'Content-Type': 'application/json'
            }
        };

        if (body && ['POST', 'PATCH', 'PUT'].includes(method)) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`⚠️ Baserow API Error [${response.status}]: ${errorText}`);
                return null;
            }

            if (method === 'DELETE') return { success: true };
            
            return await response.json();
        } catch (error) {
            console.warn(`⚠️ Baserow request gagal (${method} ${endpoint}):`, error.message);
            return null;
        }
    }

    // ==========================================
    // READ Operations (Untuk Vercel / Primary Mode)
    // ==========================================

    /**
     * Ambil semua siswa dari Baserow
     * Mengembalikan format yang kompatibel dengan frontend
     */
    async getAllStudents() {
        const result = await this._request('GET',
            `/database/rows/table/${this.studentsTableId}/?size=200&order_by=-id`
        );

        if (!result || !result.results) return [];

        const students = result.results.map(row => this._mapRowToStudent(row));

        // Ambil dokumen untuk setiap siswa jika tabel dokumen dikonfigurasi
        if (this.documentsTableId) {
            for (const student of students) {
                student.profil_doc = await this._getDocsForStudent(student.id);
            }
        }

        return students;
    }

    /**
     * Ambil satu siswa berdasarkan app_id
     */
    async getStudentById(appId) {
        const row = await this._findRowByAppId(this.studentsTableId, appId);
        if (!row) return null;

        const student = this._mapRowToStudent(row);
        if (this.documentsTableId) {
            student.profil_doc = await this._getDocsForStudent(appId);
        }
        return student;
    }

    /**
     * Ambil dokumen untuk siswa tertentu
     */
    async _getDocsForStudent(studentAppId) {
        if (!this.documentsTableId) return [];

        const result = await this._request('GET',
            `/database/rows/table/${this.documentsTableId}/?filter__student_id__equal=${encodeURIComponent(studentAppId)}&size=100`
        );

        if (!result || !result.results) return [];

        return result.results.map(row => ({
            id: row.id,
            student_id: row.student_id || '',
            file_name: row.file_name || '',
            file_type: row.file_type || '',
            file_url: row.file_url || '',
            server_filename: row.server_filename || ''
        }));
    }

    // ==========================================
    // WRITE Operations
    // ==========================================

    /**
     * Buat siswa baru di Baserow
     * Field di Baserow harus ada: app_id, nama, kelas, nisn, foto, talenta, deskripsi
     */
    async createStudent(student) {
        const result = await this._request('POST', `/database/rows/table/${this.studentsTableId}/`, {
            app_id: student.id,
            nama: student.nama,
            kelas: student.kelas,
            nisn: student.nisn,
            foto: student.foto || '',
            talenta: Array.isArray(student.talenta) ? student.talenta.join(', ') : (student.talenta || ''),
            deskripsi: student.deskripsi || ''
        });

        if (result) {
            return this._mapRowToStudent(result);
        }
        return null;
    }

    /**
     * Update siswa di Baserow
     */
    async updateStudent(student) {
        const row = await this._findRowByAppId(this.studentsTableId, student.id);
        if (!row) return null;

        const result = await this._request('PATCH', `/database/rows/table/${this.studentsTableId}/${row.id}/`, {
            nama: student.nama,
            kelas: student.kelas,
            nisn: student.nisn,
            foto: student.foto || '',
            talenta: Array.isArray(student.talenta) ? student.talenta.join(', ') : (student.talenta || ''),
            deskripsi: student.deskripsi || ''
        });

        if (result) return this._mapRowToStudent(result);
        return null;
    }

    /**
     * Hapus siswa dari Baserow (beserta dokumen terkait)
     */
    async deleteStudent(appId) {
        // Hapus dokumen terkait terlebih dahulu
        if (this.documentsTableId) {
            const docs = await this._getDocsForStudent(appId);
            for (const doc of docs) {
                await this._request('DELETE', `/database/rows/table/${this.documentsTableId}/${doc.id}/`);
            }
        }

        const row = await this._findRowByAppId(this.studentsTableId, appId);
        if (!row) return null;

        return this._request('DELETE', `/database/rows/table/${this.studentsTableId}/${row.id}/`);
    }

    /**
     * Buat dokumen di Baserow
     */
    async createDocument(doc) {
        if (!this.documentsTableId) return null;

        return this._request('POST', `/database/rows/table/${this.documentsTableId}/`, {
            student_id: doc.student_id,
            file_name: doc.file_name,
            file_type: doc.file_type,
            file_url: doc.file_url,
            server_filename: doc.server_filename || ''
        });
    }

    /**
     * Hapus dokumen dari Baserow
     */
    async deleteDocument(studentId, fileName) {
        if (!this.documentsTableId) return null;

        const result = await this._request('GET',
            `/database/rows/table/${this.documentsTableId}/?filter__student_id__equal=${encodeURIComponent(studentId)}&filter__file_name__equal=${encodeURIComponent(fileName)}&size=1`
        );

        if (result && result.results && result.results.length > 0) {
            return this._request('DELETE', `/database/rows/table/${this.documentsTableId}/${result.results[0].id}/`);
        }
        return null;
    }

    // ==========================================
    // Helpers
    // ==========================================

    /**
     * Konversi row Baserow ke format student aplikasi
     */
    _mapRowToStudent(row) {
        let talenta = [];
        if (row.talenta) {
            if (typeof row.talenta === 'string') {
                talenta = row.talenta.split(',').map(t => t.trim()).filter(Boolean);
            } else if (Array.isArray(row.talenta)) {
                talenta = row.talenta;
            }
        }

        return {
            id: row.app_id || `br-${row.id}`,
            nama: row.nama || '',
            kelas: row.kelas || '',
            nisn: row.nisn || '',
            foto: row.foto || '',
            talenta: talenta,
            deskripsi: row.deskripsi || '',
            profil_doc: [],
            _baserow_row_id: row.id
        };
    }

    /**
     * Cari row di Baserow berdasarkan field app_id
     */
    async _findRowByAppId(tableId, appId) {
        const result = await this._request('GET',
            `/database/rows/table/${tableId}/?filter__app_id__equal=${encodeURIComponent(appId)}&size=1`
        );

        if (result && result.results && result.results.length > 0) {
            return result.results[0];
        }
        return null;
    }

    /**
     * Tes koneksi ke Baserow
     */
    async testConnection() {
        if (!this.enabled) {
            return { connected: false, reason: 'Baserow tidak dikonfigurasi (variabel env kosong)' };
        }

        try {
            const result = await this._request('GET', `/database/rows/table/${this.studentsTableId}/?size=1`);
            if (result !== null) {
                return { connected: true, reason: 'Terhubung ke Baserow' };
            }
            return { connected: false, reason: 'Gagal mengakses tabel Baserow' };
        } catch (error) {
            return { connected: false, reason: error.message };
        }
    }
}

// Singleton instance
const baserowClient = new BaserowClient();

module.exports = baserowClient;
