const Mysql = require('../../config/mysql')

class OrderInvoiceModel {
    async find(orderId) {
        const query = `SELECT order_id, invoice_id, created_at
                        FROM order_invoices
                        WHERE order_id = ?;`
        console.log(orderId)
        const [rows] = await Mysql.promise().query(query, [orderId])
        return rows
    }
}

module.exports = OrderInvoiceModel
