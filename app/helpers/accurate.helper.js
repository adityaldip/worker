const GeneralHelper = require('./general.helper')
const RequestHelper = require('./request.helper')
const { accurateMapping } = require('./mapping.helper')
const { ItemModel } = require('../models/item.model')
const OrderModel = require('../models/order.model')
const SellerModel = require('../models/seller.model')
const CustomerModel = require('../models/customer.model')
const InvoiceModel = require('../models/invoice.model')

const helper = new GeneralHelper()
const request = new RequestHelper()
const orderModel = new OrderModel()
const sellerModel = new SellerModel()
const customerModel = new CustomerModel()
const invoiceModel = new InvoiceModel()
const itemModel = new ItemModel()

const maxAttempts = process.env.MAX_ATTEMPT || 5

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
                activity: 'create a new order',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
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
                await this.credentialHandle(message)
                await orderModel.update(
                    { id: order.id },
                    { $inc: { attempts: 1 }, $set: { last_error: message } }
                )
                if (order.attempts < maxAttempts) {
                    await helper.pubQueue('accurate_sales_order', order._id)
                }
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
                activity: 'create an order invoice',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
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
                await this.credentialHandle(message)
                await orderModel.update(
                    { id: order.id },
                    { $inc: { attempts: 1 }, $set: { last_error: response.d } }
                )
                if (order.attempts < maxAttempts) {
                    await helper.pubQueue('accurate_sales_invoice', order._id)
                }
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
                activity: 'create an order receipt payment',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
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
                await this.credentialHandle(message)
                await orderModel.update(
                    { id: order.id },
                    { $inc: { attempts: 1 }, $set: { last_error: response.d } }
                )
                if (order.attempts < maxAttempts) {
                    await helper.pubQueue('accurate_sales_paid', order._id)
                }
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
                activity: 'create a new item',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
            })
            if (response.s) {
                item.accurate_id = response.r.id
                item.profile_id = this.account.profile_id
                item.synced = true
                await itemModel.insert(item)
            } else {
                const message =
                    (Array.isArray(response.d) ? response.d[0] : response.d) ||
                    response
                await this.credentialHandle(message)

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
                activity: 'sync items to accurate',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
            })
            if (response.s) {
                await itemModel.updateMany(
                    { no: { $in: skus }, profile_id: this.account.profile_id },
                    { $set: { synced: true } }
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
                                { $set: { synced: true } }
                            )
                        } else {
                            const message = res.d[0]
                            const expected =
                                GeneralHelper.ACCURATE_RESPONSE_MESSAGE
                            const condition =
                                message.includes(expected.KODE_VALID) ||
                                message.includes(expected.NILAI) ||
                                message.includes(expected.BESAR)
                            let updateItem = message.includes(expected.KODE)
                                ? { $set: { synced: true } }
                                : {
                                    $inc: { attempts: 1 },
                                    $set: { last_error: res },
                                }
                            if (condition) {
                                updateItem = {
                                    $set: { attempts: 5, last_error: res },
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
                }
                const message =
                    response.d[0].d[0] ||
                    (Array.isArray(response.d) ? response.d[0] : response.d) ||
                    response
                await this.credentialHandle(message)
            }
        } catch (error) {
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
                activity: 'create a new customer',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
            })
            if (response.s) {
                body.accurate_id = response.r.id
                body.profile_id = order.profile_id
                await customerModel.insert(body)
            } else {
                const message =
                    (Array.isArray(response.d) ? response.d[0] : response.d) ||
                    response
                await this.credentialHandle(message)

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
            const endpoint = `api/sales-order/save.do`

            const body = accurateMapping.order(order)
            const payload = this.payloadBuilder(endpoint, body)
            const response = await request.requestPost(payload)
            await helper.accurateLog({
                activity: 'delete an order',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
            })

            if (response.s) {
                await orderModel.update(
                    { id: order.id },
                    { $set: { synced: true } }
                );
            } else {
                const message =
                    (Array.isArray(response.d) ? response.d[0] : response.d) ||
                    response
                await this.credentialHandle(message)
                await orderModel.update(
                    { id: order.id },
                    { $inc: { attempts: 1 }, $set: { last_error: message } }
                )
                if (order.attempts < maxAttempts) {
                    await helper.pubQueue('accurate_sales_cancelled', order._id)
                }
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
                activity: 'refresh access token',
                profile_id: this.account.profile_id,
                params: form,
                log: response,
            })
            if (response.access_token) {
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
                activity: 'refresh db session',
                profile_id: this.account.profile_id || this.account.seller_id,
                params: payload,
                log: response,
            })
            if (response.s) {
                let result = {}
                if (typeof response.d === 'object') {
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

    async credentialHandle(response) {
        if (response.includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.TOKEN)) {
            await this.refreshToken()
        } else if (
            response.includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.SESSION)
        ) {
            await this.refreshSession()
        }
    }
}

module.exports = AccurateHelper
