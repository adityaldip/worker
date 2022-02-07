const RequestHelper = require('./request.helper')
const { accurateMapping } = require('./mapping.helper')
const OrderModel = require("../models/order.model")
const SellerModel = require("../models/seller.model")
const { ItemModel } = require("../models/item.model")
const GeneralHelper = require('./general.helper')
const CustomerModel = require('../models/customer.model')
const InvoiceModel = require('../models/invoice.model')

const helper = new GeneralHelper()
const request = new RequestHelper()
const orderModel = new OrderModel()
const sellerModel = new SellerModel()
const customerModel = new CustomerModel()
const invoiceModel = new InvoiceModel()
const itemModel = new ItemModel()

const maxAttempts = process.env.MAX_ATTEMPT || 5;

class AccurateHelper {

    constructor(account = null) {
        if(account) this.setAccount(account)
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
            });
            
            if (response.s) {
                await orderModel.update(
                    { id: order.id },
                    {
                        $set: {
                            accurate_id: response.r.id,
                            synced: true,
                            shippingAccountNo: order.shippingAccountNo,
                            accountNo: order.accountNo,
                            branchId: order.branchId
                        },
                    }
                )
                if (order.status === 'Shipped') {
                    await helper.pubQueue('accurate_sales_invoice', order._id)
                } else if(order.status === 'Delivered') {
                    await helper.pubQueue('accurate_sales_paid', order._id)
                }
            } else {
                if ((response.d[0] || response.d || response).includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.SESSION))
                    await this.refreshSession() 
                await orderModel.update(
                    { id: order.id },
                    { $inc: { attempts: 1 }, $set: { last_error: response.d } }
                )
                if (order.attempts < maxAttempts) {
                    await helper.pubQueue('accurate_sales_order', order._id)
                }
                throw new Error(response.d[0] || response.d || response)
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
            });
            
            if (response.s) {
                body.accurate_id = response.r.id
                body.order_id = order.id
                body.number = response.r.number
                await orderModel.update(
                    { id: order.id },
                    { $set: { synced: true, invoice: body, total_amount_accurate: response.r.totalAmount } }
                )
                await invoiceModel.insert(body)
            } else {
                if ((response.d[0] || response.d || response).includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.SESSION))
                    await this.refreshSession()
                await orderModel.update(
                    { id: order.id },
                    { $inc: { attempts: 1 }, $set: { last_error: response.d } }
                )
                if (order.attempts < maxAttempts) {
                    await helper.pubQueue('accurate_sales_invoice', order._id)
                }
                throw new Error(response.d[0] || response.d || response)
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
            });
            
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
                if ((response.d[0] || response.d || response).includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.SESSION))
                    await this.refreshSession()
                await orderModel.update(
                    { id: order.id },
                    { $inc: { attempts: 1 }, $set: { last_error: response.d } }
                )
                if (order.attempts < maxAttempts) {
                    await helper.pubQueue('accurate_sales_paid', order._id)
                }
                throw new Error(response.d[0] || response.d || response)
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
            });
            if (response.s) {
                item.accurate_id = response.r.id
                item.profile_id = this.account.profile_id
                item.synced = true
                await itemModel.insert(item)
            } else {
                if ((response.d[0] || response.d || response).includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.SESSION))
                    await this.refreshSession()

                throw new Error(response.d[0] || response.d || response)
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
            const skus = items.map(item => item.no)
            await helper.accurateLog({
                activity: 'sync items to accurate',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
            });
            if (response.s) {
                await itemModel.updateMany(
                    { no: { $in: skus }, profile_id: this.account.profile_id },
                    { $set: { synced: true } }
                )
            } else { 
                let count = 0
                if (Array.isArray(response.d)) {
                    for (const res of response.d) {
                        if (res.s) {
                            await itemModel.update(
                                { profile_id: this.account.profile_id, no: res.r.no },
                                { $set: { synced: true } }
                            )
                        } else {
                            const message = res.d[0];
                            const expected = GeneralHelper.ACCURATE_RESPONSE_MESSAGE;
                            const condition = message.includes(expected.KODE_VALID) || message.includes(expected.NILAI) || message.includes(expected.BESAR)
                            let updateItem = message.includes(expected.KODE) ?
                                { $set: { synced: true } } :
                                { $inc: { attempts: 1 }, $set: { last_error: res } };
                            if (condition) {
                                updateItem = { $set: { attempts: 5, last_error: res } }
                            }
                            await itemModel.update({ profile_id: this.account.profile_id, no: skus[count] }, updateItem);
                        }
                        count++
                    }
                }
                if ((response.d[0].d[0] || response.d[0] || response.d || response).includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.SESSION))
                    await this.refreshSession()
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
            });
            if (response.s) {
                body.accurate_id = response.r.id
                body.profile_id = order.profile_id
                await customerModel.insert(body)
            } else {
                const message = response.d[0] || response.d || response
                if (message.includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.SESSION))
                    await this.refreshSession()
    
                if (message.includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.DATA)) {
                    body.profile_id = order.profile_id
                    await customerModel.insert(body)
                }

                throw new Error(message)
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
            const response = await request.requestGet(payload);
            await helper.accurateLog({
                activity: 'refresh db session',
                profile_id: this.account.profile_id || this.account.seller_id,
                params: payload,
                log: response
            });
            if (response.s) {
                if (typeof response.d === 'object' ) {
                    const dbSession = response.d.session
                    const licenseEnd = response.d.licenseEnd;
                    const accessibleUntil = response.d.accessibleUntil;
                    await sellerModel.update(
                        { seller_id: this.account.seller_id || this.account.profile_id },
                        { $set: { api_db_session: dbSession, api_db_license_end: licenseEnd, api_db_accessible_until: accessibleUntil } }
                    )
                }
            } else {
                throw new Error(response)
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }

}

module.exports = AccurateHelper