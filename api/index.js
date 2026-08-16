/**
 * ITAKA — Vercel Serverless Function Entry Point
 * 
 * File ini membungkus Express app agar berjalan sebagai
 * Vercel Serverless Function. Semua request /api/* diarahkan ke sini.
 */

const app = require('../server');

module.exports = app;
