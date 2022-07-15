const GeneralHelper = require('./general.helper')
const RequestHelper = require('./request.helper')
const { accurateMapping } = require('./mapping.helper')
const { ItemModel, ItemSyncModel } = require('../models/item.model')
const OrderModel = require('../models/order.model')
const SellerModel = require('../models/seller.model')
const CustomerModel = require('../models/customer.model')
const InvoiceModel = require('../models/invoice.model')
const { ObjectID } = require('bson')

const helper = new GeneralHelper()
const request = new RequestHelper()
const orderModel = new OrderModel()
const sellerModel = new SellerModel()
const customerModel = new CustomerModel()
const invoiceModel = new InvoiceModel()
const itemModel = new ItemModel()
const itemSyncModel = new ItemSyncModel()

const maxAttempts = process.env.MAX_ATTEMPT || 5
const queue = process.env.DELAYED_QUEUE || 'middleware-delayed-jobs'

class AccurateHelper {
    constructor(account = null) {
        if (account) this.setAccount(account)
    }

    payloadBuilder(uri, body) {
        return {
            uri: `${this.account.api_db_url}/accurate/${uri}`,
            headers: {
                'X-SESSION-ID': this.account.api_db_session,
                Authorization: `Bearer ${this.account.api_access_token}`,
            },
            body,
            json: true,
        }
    }

    getMaxAttempt() {
        return parseInt(maxAttempts)
    }

    setAccount(account) {
        this.account = account
    }

    async setProfileId(profileId) {
        const account = await sellerModel.findBy({ seller_id: profileId })
        this.setAccount(account)
    }

    async storeOrder(order) {
        try {
            const endpoint = `api/sales-order/save.do`

            const mappedOrder = accurateMapping.order(order)
            if (mappedOrder.newItem) {
                await itemModel.insertMany(mappedOrder.newItem)
                await this.storeItemBulk(mappedOrder.newItem)
            }
            const body = mappedOrder.newItem ? mappedOrder.mapped : mappedOrder
            const payload = this.payloadBuilder(endpoint, body)
            const response = await request.requestPost(payload)
            await helper.accurateLog({
                created_at: new Date(),
                type: 'ORDER',
                activity: 'create a new order',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
                order_id: order.id,
            })

            if (response.s) {
                await orderModel.update(
                    { id: order.id },
                    {
                        $set: {
                            accurate_id: response.r.id,
                            synced: true,
                            shippingAccountId: order.shippingAccountId,
                            accountNo: order.accountNo,
                            branchId: order.branchId,
                        },
                    }
                )
                if (order.status === 'Ready to Ship') {
                    await helper.pubQueue('accurate_sales_invoice', order._id)
                } else if (order.status === 'Delivered') {
                    await helper.pubQueue('accurate_sales_paid', order._id)
                } else if (order.status === 'Cancelled') {
                    await helper.pubQueue('accurate_sales_cancelled', order._id)
                }
            } else {
                const message =
                    (Array.isArray(response.d) ? response.d[0] : response.d) ||
                    response
                if (
                    message.includes(
                        GeneralHelper.ACCURATE_RESPONSE_MESSAGE.PESANAN_ADA
                    )
                ) {
                    if (order.status === 'Ready to Ship') {
                        await helper.pubQueue(
                            'accurate_sales_invoice',
                            order._id
                        )
                    } else if (order.status === 'Delivered') {
                        await helper.pubQueue('accurate_sales_paid', order._id)
                    } else if (order.status === 'Cancelled') {
                        await helper.pubQueue(
                            'accurate_sales_cancelled',
                            order._id
                        )
                    } else {
                        await orderModel.update(
                            { id: order.id },
                            { $set: { last_error: response, synced: true } }
                        )
                    }
                    return
                }

                await this.credentialHandle(message, order)
                await this.delayedQueue(
                    order.attempts,
                    'accurate_sales_order',
                    order._id
                )
                await orderModel.update(
                    { id: order.id },
                    {
                        $inc: { attempts: 1 },
                        $set: { last_error: response, synced: false },
                    }
                )
                throw new Error(message)
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    async storeInvoice(order) {
        try {
            const endpoint = `api/sales-invoice/save.do`

            const body = accurateMapping.invoice(order)
            const payload = this.payloadBuilder(endpoint, body)
            const response = await request.requestPost(payload)
            await helper.accurateLog({
                created_at: new Date(),
                type: 'ORDER',
                activity: 'create an order invoice',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
                order_id: order.id,
            })

            if (response.s) {
                body.accurate_id = response.r.id
                body.order_id = order.id
                body.number = response.r.number
                await orderModel.update(
                    { id: order.id },
                    {
                        $set: {
                            synced: true,
                            invoice: body,
                            total_amount_accurate: response.r.totalAmount,
                        },
                    }
                )
                await invoiceModel.insert(body)
            } else {
                const message =
                    (Array.isArray(response.d) ? response.d[0] : response.d) ||
                    response
                if (
                    message.includes(
                        GeneralHelper.ACCURATE_RESPONSE_MESSAGE.PROSES_DUA_KALI
                    )
                ) {
                    await orderModel.update(
                        { id: order.id },
                        { $set: { last_error: response, synced: true } }
                    )
                    return
                }

                await this.credentialHandle(message, order)
                await this.delayedQueue(
                    order.attempts,
                    'accurate_sales_invoice',
                    order._id
                )
                await orderModel.update(
                    { id: order.id },
                    {
                        $inc: { attempts: 1 },
                        $set: { last_error: response, synced: false },
                    }
                )
                throw new Error(message)
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    async storeReceipt(order) {
        try {
            const endpoint = `api/sales-receipt/save.do`

            const body = accurateMapping.receipt(order)
            const payload = this.payloadBuilder(endpoint, body)
            const response = await request.requestPost(payload)
            await helper.accurateLog({
                created_at: new Date(),
                type: 'ORDER',
                activity: 'create an order receipt payment',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
                order_id: order.id,
            })

            if (response.s) {
                body.accurate_id = response.r.id
                body.order_id = order.id
                body.number = response.r.number
                await orderModel.update(
                    { id: order.id },
                    { $set: { synced: true, receipt: body } }
                )
                await invoiceModel.update(
                    { order_id: order.id },
                    { $set: { receipt: body } }
                )
            } else {
                const message =
                    (Array.isArray(response.d) ? response.d[0] : response.d) ||
                    response
                await this.credentialHandle(message, order)
                await this.delayedQueue(
                    order.attempts,
                    'accurate_sales_paid',
                    order._id
                )
                await orderModel.update(
                    { id: order.id },
                    {
                        $inc: { attempts: 1 },
                        $set: { last_error: response, synced: false },
                    }
                )
                throw new Error(message)
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    async storeItem(item) {
        try {
            const endpoint = `api/item/save.do`

            const body = accurateMapping.item(item)
            const payload = this.payloadBuilder(endpoint, body)
            const response = await request.requestPost(payload)
            await helper.accurateLog({
                created_at: new Date(),
                type: 'ITEM',
                activity: 'create a new item',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
            })
            if (response.s) {
                item.accurate_id = response.r.id
                item.profile_id = this.account.profile_id
                item.synced = true
                item.synced_at = new Date()
                await itemModel.insert(item)
            } else {
                const message =
                    (Array.isArray(response.d) ? response.d[0] : response.d) ||
                    response
                await this.credentialHandle(message, '')

                throw new Error(message)
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    async storeItemBulk(items) {
        try {
            const endpoint = `api/item/bulk-save.do`

            const body = { data: items }
            const payload = this.payloadBuilder(endpoint, body)
            const response = await request.requestPost(payload)
            const skus = items.map((item) => item.no)
            await helper.accurateLog({
                created_at: new Date(),
                type: 'ITEM',
                activity: 'sync items to accurate',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
            })
            if (response.s) {
                await itemModel.updateMany(
                    { no: { $in: skus }, profile_id: this.account.profile_id },
                    { $set: { synced: true, synced_at: new Date() } }
                )
            } else {
                if (Array.isArray(response.d)) {
                    let count = 0
                    for (const res of response.d) {
                        if (res.s) {
                            await itemModel.update(
                                {
                                    profile_id: this.account.profile_id,
                                    no: res.r.no,
                                },
                                {
                                    $set: {
                                        synced: true,
                                        synced_at: new Date(),
                                    },
                                }
                            )
                        } else {
                            const message =
                                (Array.isArray(res.d) ? res.d[0] : res.d) || res // res.d ? res.d[0] : res
                            const expected =
                                GeneralHelper.ACCURATE_RESPONSE_MESSAGE
                            const rejectedItem =
                                message.includes(expected.KODE_VALID) ||
                                message.includes(expected.NILAI) ||
                                message.includes(expected.BESAR) ||
                                message.includes(expected.BARCODE) ||
                                message.includes(expected.SALDO_AWAL)
                            let updateItem = message.includes(expected.KODE) ? {
                                $set: {
                                    synced: true,
                                    attempts: 5,
                                    synced_at: new Date(),
                                },
                            } : {
                                $inc: { attempts: 1 },
                                $set: { last_error: res, synced: false },
                            }
                            if (rejectedItem) {
                                updateItem = {
                                    $set: {
                                        attempts: 5,
                                        last_error: res,
                                        synced: false,
                                    },
                                }
                            }
                            await itemModel.update(
                                {
                                    profile_id: this.account.profile_id,
                                    no: skus[count],
                                },
                                updateItem
                            )
                        }
                        count++
                    }
                } else {
                    const message =
                        (Array.isArray(response.d)
                            ? response.d[0]
                            : response.d) || response
                    await this.credentialHandle(message, '')
                }
            }
        } catch (error) {
            throw new Error(error.message)
        } finally {
            // DELETE ITEM WITH MAX ATTEMPTS AND NOT SYNCED
            await itemModel.deleteMany({
                attempts: { $gte: maxAttempts },
                synced: false,
            })
        }
    }

    async getStockItem(itemJob, itemSync) {
        try {
            const endpoint = 'api/item/get-stock.do'
            const body = {
                warehouseName: itemJob.warehouseName || 'Utama',
                no: itemJob.sku,
            }
            const payload = this.payloadBuilder(endpoint, body)
            const response = await request.requestGet(payload)
            if (response.s) {
                // SKU found on accurate
                await itemSyncModel.update(
                    { _id: itemSync._id },
                    {
                        $push: {
                            item_accurate_quantity: {
                                _id: new ObjectID(),
                                sku: itemJob.sku,
                                warehouseName: itemJob.warehouseName,
                                quantity: response.d.availableStock,
                            },
                        },
                        $inc: { item_accurate_count: 1 },
                    }
                )
            } else {
                const message =
                    (Array.isArray(response.d) ? response.d[0] : response.d) ||
                    response
                if (
                    message.includes(
                        GeneralHelper.ACCURATE_RESPONSE_MESSAGE.ITEM
                    )
                ) {
                    // SKU not found on accurate
                    await itemSyncModel.update(
                        { _id: itemSync._id },
                        {
                            $push: {
                                item_accurate_quantity: {
                                    _id: new ObjectID(),
                                    sku: itemJob.sku,
                                    warehouseName: itemJob.warehouseName,
                                    error: message,
                                },
                            },
                            $inc: { item_accurate_count: 1 },
                        }
                    )
                    return
                }

                throw new Error(message)
            }
        } catch (error) {
            // Error due to rate limiting or something else
            if (!itemJob.attempt) itemJob.attempt = 0
            itemJob.attempt = parseInt(itemJob.attempt) + 1
            if (!itemJob.attempt || itemJob.attempt < maxAttempts) {
                await this.delayedQueue(
                    itemJob.attempt,
                    'accurate_items_fetch',
                    itemJob,
                    true
                )
            } else {
                // SKU failed to fetch
                await itemSyncModel.update(
                    { _id: itemSync._id },
                    {
                        $push: {
                            item_accurate_quantity: {
                                _id: new ObjectID(),
                                sku: itemJob.sku,
                                warehouseName: itemJob.warehouseName,
                                error: error.message,
                            },
                        },
                        $inc: { item_accurate_count: 1 },
                    }
                )
                return
            }
            throw new Error(error.message)
        }
    }

    async storeCustomer(order) {
        try {
            const endpoint = `api/customer/save.do`

            const body = accurateMapping.customer(order)
            const payload = this.payloadBuilder(endpoint, body)
            const response = await request.requestPost(payload)
            await helper.accurateLog({
                created_at: new Date(),
                type: 'CUSTOMER',
                activity: 'create a new customer',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
            })
            if (response.s) {
                body.accurate_id = response.r.id
                body.profile_id = order.profile_id
                await customerModel.update(
                    { customerNo: body.customerNo, profile_id: body.profileId },
                    { $set: body }
                )
            } else {
                const message =
                    (Array.isArray(response.d) ? response.d[0] : response.d) ||
                    response
                await this.credentialHandle(message, order)

                if (
                    message.includes(
                        GeneralHelper.ACCURATE_RESPONSE_MESSAGE.DATA
                    )
                ) {
                    body.profile_id = order.profile_id
                    await customerModel.insert(body)
                }

                throw new Error(message)
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    async deleteOrder(order) {
        try {
            const endpoint = `api/sales-order/manual-close-order.do`

            const body = accurateMapping.orderClosed(order)
            const payload = this.payloadBuilder(endpoint, body)
            const response = await request.requestPost(payload)
            await helper.accurateLog({
                created_at: new Date(),
                type: 'ORDER',
                activity: 'delete an order',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
                order_id: order.id,
            })

            if (response.s) {
                await orderModel.update(
                    { id: order.id },
                    { $set: { synced: true } }
                )
            } else {
                const message =
                    (Array.isArray(response.d) ? response.d[0] : response.d) ||
                    response
                if (
                    message.includes(
                        GeneralHelper.ACCURATE_RESPONSE_MESSAGE.SUDAH_TUTUP
                    )
                ) {
                    await orderModel.update(
                        { id: order.id },
                        { $set: { last_error: response, synced: true } }
                    )

                    return
                }

                await this.credentialHandle(message, order)
                await this.delayedQueue(
                    order.attempts,
                    'accurate_sales_cancelled',
                    order._id
                )
                await orderModel.update(
                    { id: order.id },
                    {
                        $inc: { attempts: 1 },
                        $set: { last_error: message, synced: false },
                    }
                )
                throw new Error(message)
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    async refreshToken() {
        try {
            const url = `https://account.accurate.id/oauth/token`
            const headers = {
                Authorization: `Basic ${process.env.AUTHORIZATION_TOKEN}`,
            }
            const form = {
                grant_type: 'refresh_token',
                refresh_token: this.account.api_token_refresh,
            }
            const payload = {
                url,
                headers,
                form,
                json: true,
            }
            const response = await request.requestPost(payload)
            await helper.accurateLog({
                created_at: new Date(),
                activity: 'refresh access token',
                profile_id: this.account.profile_id,
                params: form,
                log: response,
            })
            if (response.access_token && response.refresh_token) {
                const today = new Date()
                const expired_at = new Date(today)
                expired_at.setDate(expired_at.getDate() + 15)
                const result = {
                    api_access_token: response.access_token,
                    api_token_refresh: response.refresh_token,
                    token_expired_at: expired_at,
                }
                await sellerModel.update(
                    { seller_id: this.account.seller_id },
                    { $set: result }
                )
                this.account = { ...this.account, ...result }
            } else {
                throw new Error(response.d || response)
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    async refreshSession() {
        try {
            const payload = {
                uri: `https://account.accurate.id/api/db-refresh-session.do`,
                json: true,
                body: {
                    session: this.account.api_db_session,
                    id: this.account.api_db_id,
                },
                headers: {
                    Authorization: `Bearer ${this.account.api_access_token}`,
                },
                method: 'GET',
            }
            const response = await request.requestGet(payload)
            await helper.accurateLog({
                created_at: new Date(),
                activity: 'refresh db session',
                profile_id: this.account.profile_id || this.account.seller_id,
                params: payload,
                log: response,
            })
            if (response.s) {
                let result = {}
                if (typeof response.d === 'object' && response.d.session) {
                    result = {
                        api_db_session: response.d.session,
                        api_db_license_end: response.d.licenseEnd,
                        api_db_accessible_until: response.d.accessibleUntil,
                    }
                    await sellerModel.update(
                        {
                            seller_id:
                                this.account.seller_id ||
                                this.account.profile_id,
                        },
                        { $set: result }
                    )
                }
                this.account = { ...this.account, ...result }
            } else {
                if ((response.d || response).includes('invalid_token')) {
                    await this.refreshToken()
                    return await this.refreshSession()
                } else {
                    throw new Error(response.d || response)
                }
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    async credentialHandle(response, order = '') {
        if (response.includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.TOKEN)) {
            await this.refreshToken()
        } else if (
            response.includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.SESSION)
        ) {
            await this.refreshSession()
        } else if (
            response.includes(
                GeneralHelper.ACCURATE_RESPONSE_MESSAGE.PESANAN_PENJUALAN
            ) &&
            response.includes(
                GeneralHelper.ACCURATE_RESPONSE_MESSAGE.TIDAK_DITEMUKAN
            )
        ) {
            await this.storeOrder(order)
        } else if (
            response.includes(
                GeneralHelper.ACCURATE_RESPONSE_MESSAGE.PELANGGAN,
                GeneralHelper.ACCURATE_RESPONSE_MESSAGE.TIDAK_DITEMUKAN
            )
        ) {
            await this.storeCustomer(order)
        } else if (
            response.includes(
                GeneralHelper.ACCURATE_RESPONSE_MESSAGE.ITEM,
                GeneralHelper.ACCURATE_RESPONSE_MESSAGE.TIDAK_DITEMUKAN
            )
        ) {
            const mappedOrder = accurateMapping.order(order)
            await this.storeItemBulk(mappedOrder.detailItem)
        }
    }

    async delayedQueue(attempt, directedQueue, message, inSeconds = false) {
        if (attempt < maxAttempts) {
            const delayTime = new Date()
            if (!inSeconds)
                delayTime.setMinutes(delayTime.getMinutes() + (attempt || 1))
            else delayTime.setSeconds(delayTime.getSeconds() + (attempt || 1))

            const payload = {
                data: message,
                queue: directedQueue,
                execution: delayTime,
            }
            helper.pubQueue(queue, payload)
        }
    }
}

module.exports = AccurateHelper
