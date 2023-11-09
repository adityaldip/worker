const GeneralHelper = require('./general.helper')
const RequestHelper = require('./request.helper')
const { accurateMapping } = require('./mapping.helper')
const { ItemModel, ItemSyncModel } = require('../models/item.model')
const OrderModel = require('../models/order.model')
const SellerModel = require('../models/seller.model')
const CustomerModel = require('../models/customer.model')
const InvoiceModel = require('../models/invoice.model')
const { ObjectID } = require('bson')
const ReceiptModel = require('../models/receipt.model')
const DelayedModel = require('../models/delayed.model')

const helper = new GeneralHelper()
const delayed = new DelayedModel()
const request = new RequestHelper()
const orderModel = new OrderModel()
const sellerModel = new SellerModel()
const customerModel = new CustomerModel()
const invoiceModel = new InvoiceModel()
const itemModel = new ItemModel()
const itemSyncModel = new ItemSyncModel()
const receiptModel = new ReceiptModel()

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

    async storeInvoiceNew(order) {
        try {
            const endpoint = `api/sales-invoice/save.do`
            const body = accurateMapping.invoice(order)
            const payload = this.payloadBuilder(endpoint, body)
            const response = await request.requestPost(payload)
            console.log(response)
            await helper.accurateLog({
                created_at: new Date(),
                type: 'ORDER',
                activity: 'create an order invoice new ',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
                order_id: order.id,
                attempt: order.attempts
            })
            if (response.s) {
                body.accurate_id = response.r.id
                body.order_id = order.id
                body.number = response.r.number
                await orderModel.update(
                    { _id: ObjectID(order._id) },
                    {
                        $set: {
                            synced: true,
                            invoice: body,
                            date_invoice: new Date(order.transDate),
                            total_amount_accurate: response.r.totalAmount,
                        },
                    }
                )
                await invoiceModel.insert(body)
                await this.sendSummaryExportEvent(order,'invoice',response.d[0].replace(/"/g, ''),'success')
            } else {
                await this.sendSummaryExportEvent(order,'invoice',response.d[0].replace(/"/g, ''),'failed')
                const message = (Array.isArray(response.d) ? response.d[0] : response.d) || response
                if (message.includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.PROSES_DUA_KALI) || message.includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.INVOICE_ADA)) {
                    console.log("kesini");
                    await orderModel.update(
                        { _id: ObjectID(order._id) },
                        { $set: { last_error: response, date_invoice: new Date(order.transDate), synced: true } }
                    )
                    
                    return
                } else if (message.includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.ITEM)) {
                    await this.missingItemSkusOnAccurate(order,response)
                }
                await this.credentialHandle(message, order)
                if (order.attempts < maxAttempts) {
                    await delayed.insert({
                        profile_id: order.profile_id,
                        queue: "accurate_invoice_sales",
                        payload: order._id,
                        in_progress: 0,
                        priority: 1,
                        created_at: new Date()
                    })
                }
                await orderModel.update(
                    { _id: ObjectID(order._id) },
                    {
                        $inc: { attempts: 1 },
                        $set: { last_error: response, date_invoice: new Date(order.transDate), synced: false },
                    }
                )
                if (order.attempts >= maxAttempts) {
                    helper.accurateLog({
                        activity: 'create order invoice new',
                        profile_id: order.profile_id,
                        params: body,
                        response: response,
                        log:'reach max attemps',
                        attempt: order.attempts,
                        order_id: order.id
                    })
                }
                throw new Error(message)
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    async missingItemSkusOnAccurate(order,response) {
        // Get accurate's missing sku items from order data
        const missingItemSkus = []
        for (const item of order.item_lines) {
            if (item.bundle_info.length > 0) {
                item.bundle_info.forEach(item_bundle => {
                    missingItemSkus.push(item_bundle.sku)   
                });
            } else {
                missingItemSkus.push(item.sku)   
            }

            // get items from order's bundle if available
            if (Array.isArray(item.bundle_info) && item.bundle_info.length) {
                for (const bundle of item.bundle_info) {
                    missingItemSkus.push(bundle.sku)
                }
            }
        }
        // Get missing accurate items data from item collections
        const missingItems = await itemModel.find({
            profile_id: order.profile_id,
            no: { $in: missingItemSkus }
        })
        const newMissingitem = await missingItems.toArray()
        try {
            newMissingitem.forEach(e => {
                const found = e.detailOpenBalance.find(o => o.quantity <= 0);
                e.name = helper.removeSpecialChar(e.name)
                if (found) {
                    delete e.detailOpenBalance
                } else {
                    e.detailOpenBalance.forEach(d => {
                        d.warehouseName = order.warehouseName
                    })
                }
            });
            if (newMissingitem == '') {
                const account = await sellerModel.findBy({ seller_id: order.profile_id })
                const WhName = await this.getWarehouse(order.warehouse_id, account)
                const mappeditem = []
                order.item_lines.forEach(itemlines => {
                    if (itemlines.bundle_info.length > 0) {
                        itemlines.bundle_info.forEach(item_bundle => {
                            const itemline = {
                                itemType: 'INVENTORY', // required; INVENTORY
                                name: helper.removeSpecialChar(item_bundle.name), // required; item_lines.name
                                detailOpenBalance: [
                                    {
                                        quantity: parseInt(item_bundle.qty || 10),
                                        unitCost: item_bundle.item_price || 0,
                                        warehouseName: WhName || 'Utama',
                                    },
                                ],
                                no: item_bundle.sku, // item_lines.sku
                                unit1Name: 'PCS',
                                unitPrice: item_bundle.item_price || 0, // item_lines.price
                                profile_id: order.profile_id
                            }
                            mappeditem.push(itemline)
                        });
                    } else {
                        const itemline = {
                            itemType: 'INVENTORY', // required; INVENTORY
                            name: helper.removeSpecialChar(itemlines.name), // required; item_lines.name
                            detailOpenBalance: [
                                {
                                    quantity: parseInt(order.item_lines.length || 10),
                                    unitCost: itemlines.price || 0,
                                    warehouseName: WhName || 'Utama',
                                },
                            ],
                            no: itemlines.sku, // item_lines.sku
                            unit1Name: 'PCS',
                            unitPrice: itemlines.price || 0, // item_lines.price
                            profile_id: order.profile_id
                        }
                        mappeditem.push(itemline)
                    }
                });

                await delayed.insert({
                    profile_id: order.profile_id,
                    queue: "accurate_store_items",
                    payload: mappeditem,
                    in_progress: 0,
                    priority: 3,
                    created_at: new Date()
                })
                // await this.storeItemBulk(mappeditem)

                if (order.attempts < maxAttempts) {
                    await delayed.insert({
                        profile_id: order.profile_id,
                        queue: "accurate_invoice_sales",
                        payload: order._id,
                        in_progress: 0,
                        priority: 1,
                        created_at: new Date()
                    })
                }
            } else {

                await delayed.insert({
                    profile_id: order.profile_id,
                    queue: "accurate_store_items",
                    payload: newMissingitem,
                    in_progress: 0,
                    priority: 3,
                    created_at: new Date()
                })
                // await this.storeItemBulk(newMissingitem)

                if (order.attempts < maxAttempts) {
                    await delayed.insert({
                        profile_id: order.profile_id,
                        queue: "accurate_invoice_sales",
                        payload: order._id,
                        in_progress: 0,
                        priority: 1,
                        created_at: new Date()
                    })
                }
            }

        } catch (error) {
            console.log(error.stack)
        }
        await orderModel.update(
            { _id: ObjectID(order._id) },
            {
                $inc: { attempts: 1 },
                $set: { last_error: response, synced: false },
            }
        )
        throw new Error("items order not found on accurate")
    }

    async storePayout(order) {
        try {
            const endpoint = `api/sales-receipt/save.do`
            const body = accurateMapping.payout(order)
            const payload = this.payloadBuilder(endpoint, body)
            const response = await request.requestPost(payload)
            const ordr = await orderModel.findBy({ id: order.order[0] })
            await helper.accurateLog({
                created_at: new Date(),
                type: 'ORDER',
                activity: 'create an order receipt payment new',
                profile_id: this.account.profile_id,
                params: body,
                log: response,
                order_id: order.order[0],
            })

            if (response.s) {
                body.accurate_id = response.r.id
                body.number = response.r.number
                body.message = response.d
                await receiptModel.update(
                    { _id: ObjectID(order._id) },
                    { $set: { receipt: body } }
                )
                await orderModel.update(
                    { id: order.order[0] },
                    { $set: { synced: true, receipt: body } }
                )
                await this.sendSummaryExportEvent(ordr,'payment recieve',response.d[0].replace(/"/g, ''),'success')
            } else {
                const message =
                    (Array.isArray(response.d) ? response.d[0] : response.d) ||
                    response
                if (message.includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.PEMBAYARAN_TIDAK_CUKUP)) {
                    await this.sendSummaryExportEvent(ordr,'payment recieve',response.d[0].replace(/"/g, ''),'failed')
                    await receiptModel.update(
                        { _id: order._id },
                        {
                            $inc: { attempts: 1 },
                            $set: { last_error: response, synced: false },
                        }
                    )
                }else{
                    await this.sendSummaryExportEvent(ordr,'payment recieve',response.d[0].replace(/"/g, ''),'failed')
                    await this.credentialHandle(message, order)
                    if (order.attempts < maxAttempts) {
                        await delayed.insert({
                            profile_id: order.profile_id,
                            queue: "accurate_sales_payout",
                            payload: order._id,
                            in_progress: 0,
                            priority: 1,
                            created_at: new Date()
                        })
                    }
                    await receiptModel.update(
                        { _id: order._id },
                        {
                            $inc: { attempts: 1 },
                            $set: { last_error: response, synced: false },
                        }
                    )
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
            const detailOpenBalance = items.map((i) => i.detailOpenBalance)
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
                    { $set: { synced: true, synced_at: new Date(), detailOpenBalance: detailOpenBalance[0] ?? [] } }
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
                                        detailOpenBalance: detailOpenBalance[0] ?? [],
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
                                    detailOpenBalance: detailOpenBalance[0] ?? [],
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
                await delayed.insert({
                    profile_id: itemSync.profile_id,
                    queue: "accurate_items_fetch",
                    payload: itemJob,
                    in_progress: 0,
                    priority: 2,
                    created_at: new Date()
                })
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
    
    async getTotalDataStockByWarehouse(warehouseName){
        try {
            const endpoint = `api/item/list-stock.do?sp.pageSize=100`
            const body = {
                warehouseName: warehouseName || 'Utama'
            }
            const payload = this.payloadBuilder(endpoint, body)
            const response = await request.requestGet(payload)
            if(response.s){
                return response.sp
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }
    async getStockByWarehouse(itemJob,itemSync){
        try {
            const endpoint = `api/item/list-stock.do?sp.pageSize=100&sp.page=${itemJob.page}`
            const body = {
                warehouseName: itemJob.warehouseName || 'Utama'
            }
            const payload = this.payloadBuilder(endpoint, body)
            const response = await request.requestGet(payload)
            if (response.s) {
                for await(const data of response.d) {
                    if(data.quantity >= 0){
                        await itemSyncModel.update(
                            { _id: itemSync._id },
                            {
                                $push: {
                                    item_accurate_quantity: {
                                        _id: new ObjectID(),
                                        sku: data.no,
                                        warehouseName: itemJob.warehouseName,
                                        quantity: data.quantity,
                                    },
                                },
                                $inc: { item_accurate_count: 1 },
                            }
                        )
                    }
                }
                return response.sp
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
                if (order.attempts < maxAttempts) {
                    // await this.delayedQueue(
                    //     order.attempts,
                    //     'accurate_sales_cancelled',
                    //     order._id
                    // )
                    await delayed.insert({
                        profile_id: order.profile_id,
                        queue: "accurate_sales_cancelled",
                        payload: order._id,
                        in_progress: 0,
                        priority: 0,
                        created_at: new Date()
                    })
                }
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

    async deleteReceipt(order) {
        try {
            const endpoint = `api/sales-receipt/delete.do?id=${order.receipt.accurate_id}`

            // const body = accurateMapping.orderClosed(order)
            const payload = this.payloadBuilder(endpoint, {})
            const response = await request.requestDelete(payload)
            await helper.accurateLog({
                created_at: new Date(),
                type: 'ORDER',
                activity: 'delete an receipt',
                profile_id: this.account.profile_id,
                params: "",
                log: response,
                order_id: order.id,
            })

            if (response.s) {
                await orderModel.update(
                    { id: order.id },
                    { $set: { synced: true }, $unset: { receipt: true } }
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
                await orderModel.update(
                    { id: order.id },
                    {
                        $inc: { attempts: 1 },
                        $set: { last_error: message, synced: false },
                        $unset: { receipt: true }
                    }
                )
                // throw new Error(message)
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    async deleteInvoice(order) {
        try {
            const endpoint = `api/sales-invoice/delete.do?id=${order.invoice.accurate_id}`

            // const body = accurateMapping.orderClosed(order)
            const payload = this.payloadBuilder(endpoint, {})
            const response = await request.requestDelete(payload)
            await helper.accurateLog({
                created_at: new Date(),
                type: 'ORDER',
                activity: 'delete an invoice',
                profile_id: this.account.profile_id,
                params: endpoint,
                log: response,
                order_id: order.id,
            })

            if (response.s) {
                await orderModel.update(
                    { id: order.id },
                    { $set: { synced: true }, $unset: { invoice: true } }
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
                await orderModel.update(
                    { id: order.id },
                    {
                        $inc: { attempts: 1 },
                        $set: { last_error: message, synced: false },
                        $unset: { receipt: true }
                    }
                )
                // throw new Error(message)
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    async deleteSO(order) {
        try {
            const endpoint = `api/sales-order/delete.do?id=${order.accurate_id}`

            // const body = accurateMapping.orderClosed(order)
            const payload = this.payloadBuilder(endpoint, {})
            const response = await request.requestDelete(payload)
            await helper.accurateLog({
                created_at: new Date(),
                type: 'ORDER',
                activity: 'delete an sales order',
                profile_id: this.account.profile_id,
                params: "",
                log: response,
                order_id: order.id,
            })

            if (response.s) {
                await orderModel.update(
                    { id: order.id },
                    { $set: { synced: true } }
                )
                if (order.attempts < maxAttempts) {
                    await this.delayedQueue(
                        order.attempts,
                        'accurate_sales_order',
                        order._id
                    )
                }
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
                await orderModel.update(
                    { id: order.id },
                    {
                        $inc: { attempts: 1 },
                        $set: { last_error: message, synced: false },
                    }
                )
                // throw new Error(message)
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
                    this.sellerUpdateCondition(this.account),
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
                        this.sellerUpdateCondition(this.account),
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

    sellerUpdateCondition(dataSeller) {
        if (dataSeller.accurate_email != null && dataSeller.accurate_email != undefined && dataSeller.accurate_email != '' && dataSeller.accurate_email) {
            return { accurate_email: dataSeller.accurate_email };
        }
        const profileId = dataSeller.seller_id || dataSeller.profile_id;
        return { seller_id: profileId };
    }

    async credentialHandle(response, order = '') {
        if (response.includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.TOKEN)) {
            // await this.refreshToken()
            await sellerModel.update({ seller_id: this.account.profile_id || this.account.seller_id }, { $set: { "invalid_token": true } })
        } else if (
            response.includes(GeneralHelper.ACCURATE_RESPONSE_MESSAGE.SESSION)
        ) {
            // await this.refreshSession()
            await sellerModel.update({ seller_id: this.account.profile_id || this.account.seller_id }, { $set: { "invalid_token": true } })
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
        if (attempt < maxAttempts || !attempt) {
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

    async getWarehouse(warehouseId, account) {
        const { warehouses } = account
        if (!warehouseId || !warehouses) return null
        console.log(JSON.stringify(warehouses))
        console.log(warehouseId)
        const warehouseFind = warehouses.find(
            (warehouse) => warehouse.forstok_warehouse.id == warehouseId
        )
        console.log(warehouseFind)
        console.log(warehouseFind.accurate_warehouse.name)
        return warehouseFind ? warehouseFind.accurate_warehouse.name : null
    }

    async sendSummaryExportEvent(dataOrder, type, reason, status){
        const ExportData = {
            'event_date': new Date(),
            'type': type,
            'channel_order_id':dataOrder.local_id,
            'forstok_order_id':dataOrder.id,
            'channel_name': dataOrder.channel,
            'store_name': dataOrder.store_name,
            'reason': reason,
            'group_event':'accurate',
            'profile_id':dataOrder.profile_id,
            'status': status
        }
        await helper.pubQueue('summary-export-event', ExportData)
    }
}

module.exports = AccurateHelper
