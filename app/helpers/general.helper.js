const MessageBroker = require('../../config/rabbitmq')
const LogModel = require('../models/log.model')

const logModel = new LogModel()

require('dotenv').config()

const ACCURATE_RESPONSE_MESSAGE = {
    SESSION: 'Data Session Key tidak tepat',
    TOKEN: 'invalid_token',
    DATA: 'Sudah ada data lain dengan',
    KODE: 'Sudah ada data lain dengan Kode Barang',
    BARCODE: 'Sudah ada data lain dengan UPC/Barcode',
    NILAI: 'Nilai Satuan harus diisi',
    KODE_VALID: 'tidak valid. Karakter yang diperbolehkan untuk',
    BESAR: 'terlalu besar. Maksimal 30 karakter',
    PELANGGAN: 'Pelanggan',
    TIDAK_DITEMUKAN: 'tidak ditemukan atau sudah dihapus',
    ITEM: 'Barang & Jasa',
    PESANAN_ADA: 'Sudah ada data lain dengan No Pesanan',
    PROSES_DUA_KALI:
        'terdeteksi terproses dua kali. Mohon cek transaksi yang memproses pesanan tersebut',
    SUDAH_TUTUP: 'sudah ditutup, tidak dapat diproses lagi',
    PESANAN_PENJUALAN: 'Pesanan Penjualan',
    RATE_LIMIT: 'request per detik',
    SALDO_AWAL: 'Kuantitas saldo awal harus lebih besar dari 0',
    TANGGAL_MULAI_PERUSAHAAN: 'Tanggal transaksi tidak dapat lebih kecil',
    CABANG: 'lebih dari satu cabang'
}

class GeneralHelper {
    async pubQueue(queue, message) {
        try {
            const broker = await MessageBroker.getInstance()
            await broker.send(queue, Buffer.from(JSON.stringify(message)))
            console.log(' [-] Queue sent to %s', queue)
        } catch (error) {
            throw new Error(error.message)
        }
    }

    async errorLog(activity_id, log, object = {}) {
        logModel.setCollection('error_logs')
        const body = {
            activity: process.env.QUEUE_NAME,
            activity_id,
            created_at: new Date(),
            log,
            ...object,
        }
        await logModel.insert(body)
    }

    async accurateLog(payload) {
        logModel.setCollection('accurate_logs')
        payload.worker = process.env.QUEUE_NAME
        payload.created_at = new Date()
        await logModel.insert(payload)
    }

    removeSpecialChar(string){
        return string.replace(/[^a-zA-Z0-9]+/g, " ")
    }

    dateConvert(date) {
        const _date = new Date(date)
        return `${_date.getDate()}/${
            _date.getMonth() + 1
        }/${_date.getFullYear()}`
    }
}

GeneralHelper.ACCURATE_RESPONSE_MESSAGE = ACCURATE_RESPONSE_MESSAGE

module.exports = GeneralHelper
