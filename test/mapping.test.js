const chai = require('chai')

const { accurateMapping } = require('../app/helpers/mapping.helper')

const orderMock = {
    id: 35,
    status: 'Open',
    channel: 'Tokopedia',
    channel_id: 10017,
    local_id: '4140749258834',
    local_name: '4140749258834',
    store_name: 'OCBC',
    store_id: 1009,
    profile_id: 81,
    address: {
        address_1: 'Jalan Raya kertajaya Indah 97, Blok O-211',
        address_2: '',
        city: 'Surabaya',
        country: 'Indonesia',
        name: 'Entis Sutisna Cirebon',
        phone: '+6287853267888',
        postal_code: '',
        province: 'Jawa Timur',
        province_code: 'JI',
        sub_district: '',
        district: '',
        coordinate: null,
    },
    customer_info: {
        id: 1000,
        name: 'Lord Angga',
        email: '',
        customer_since: '2021-11-22T09:53:19.000+07:00',
    },
    ordered_at: '2022-02-07T09:53:10.000+07:00',
    created_at: '2022-02-07T09:53:19.000+07:00',
    updated_at: '2022-02-07T09:53:19.000+07:00',
    item_lines: [
        {
            id: 2,
            local_id: '00002',
            sku: 'sku0002',
            name: 'celana joger xl5 keren pake banget hehe 2',
            variant_name: 'Variant Item',
            variant_id: 16440507,
            variant_sku: 'KE-MIX-KIT-0002',
            price: 100000,
            sale_price: null,
            total_price: 100000,
            voucher_amount: 100,
            voucher_code: null,
            voucher_platform: 0,
            voucher_seller: 0,
            tax_price: 0,
            fulfill_by_channel: false,
            shipping_provider: null,
            shipping_provider_type: null,
            tracking_number: null,
            note: null,
            internal_note: null,
            bundle_info: [],
        },
    ],
    payment: {
        payment_method: null,
        status: 'Not Paid',
    },
    shipping_price: 1200,
    disc_shipping_seller: 0,
    disc_shipping_platform: 0,
    shipping_courier: {
        providers: ['JNT'],
        delivery_type: 'PICKUP',
        delivery_info: '-',
        awb: 'JT123231',
        document_path: '',
        booking_code: null,
        channel_docs_path: null,
        logistic_destination_code: null,
    },
    shipping_provider: null,
    shipping_provider_type: null,
    shipping_description: null,
    subtotal: 200000,
    channel_rebate: 0,
    cashless: false,
    discount_amount: 2400,
    total_price: 100000,
    insurance_fee: 0,
    discount_reason: null,
    tax_price: 0,
    warehouse_id: 78,
    cod: false,
    warehouse_code: null,
    note: 'Mantap',
    internal_note: null,
    skus: [],
}

const itemMock = {
    id: 2,
    local_id: '00002',
    sku: 'sku0002',
    name: 'celana joger xl5 keren pake banget hehe 2',
    variant_name: 'Variant Item',
    variant_id: 16440507,
    variant_sku: 'KE-MIX-KIT-0002',
    price: 100000,
    sale_price: null,
    total_price: 100000,
    voucher_amount: 100,
    voucher_code: null,
    voucher_platform: 0,
    voucher_seller: 0,
    tax_price: 0,
    fulfill_by_channel: false,
    shipping_provider: null,
    shipping_provider_type: null,
    tracking_number: null,
    note: null,
    internal_note: null,
    bundle_info: [],
}

describe('Customer mapping testing', () => {
    it('should return a mapped customer when all attributes are exist', () => {
        const mappedCustomer = accurateMapping.customer(orderMock)
        const expectedCustomer = {
            name: 'OCBC',
            transDate: '7/2/2022',
            customerNo: 1009,
        }
        chai.expect(mappedCustomer).to.deep.equal(expectedCustomer)
    })

    it('should return a mapped customer with channel as name when store_name is null', () => {
        delete orderMock.store_name
        const mappedCustomer = accurateMapping.customer(orderMock)
        const expectedCustomer = {
            name: 'Tokopedia',
            transDate: '7/2/2022',
            customerNo: 1009,
        }
        chai.expect(mappedCustomer).to.deep.equal(expectedCustomer)
    })

    it('should return an undefined mapped customer when empty object passed', () => {
        const mappedCustomer = accurateMapping.customer({})
        const expectedCustomer = {
            name: undefined,
            transDate: 'NaN/NaN/NaN',
            customerNo: undefined,
        }
        chai.expect(mappedCustomer).to.deep.equal(expectedCustomer)
    })
})

describe('Item mapping testing', () => {
    it('should return a mapped item when all attributes are exist', () => {
        const mappedItem = accurateMapping.item(itemMock)
        const expectedItem = {
            itemType: 'INVENTORY',
            name: 'celana joger xl5 keren pake banget hehe 2',
            detailOpenBalance: [
                {
                    quantity: 0,
                    unitCost: 100000,
                    warehouseName: 'Utama',
                },
            ],
            no: 'sku0002',
            unit1Name: 'PCS',
            unitPrice: 100000,
        }
        chai.expect(mappedItem).to.deep.equal(expectedItem)
    })

    it('should return a mapped item when all attributes and cost_price are exist', () => {
        itemMock.cost_price = 90000
        const mappedItem = accurateMapping.item(itemMock)
        delete itemMock.cost_price
        const expectedItem = {
            itemType: 'INVENTORY',
            name: 'celana joger xl5 keren pake banget hehe 2',
            detailOpenBalance: [
                {
                    quantity: 0,
                    unitCost: 100000,
                    warehouseName: 'Utama',
                },
            ],
            no: 'sku0002',
            unit1Name: 'PCS',
            unitPrice: 100000,
            vendorPrice: 90000,
        }
        chai.expect(mappedItem).to.deep.equal(expectedItem)
    })

    it('should return a mapped item when all attributes and taxId are exist', () => {
        itemMock.taxId = 12
        const mappedItem = accurateMapping.item(itemMock)
        delete itemMock.taxId
        const expectedItem = {
            itemType: 'INVENTORY',
            name: 'celana joger xl5 keren pake banget hehe 2',
            detailOpenBalance: [
                {
                    quantity: 0,
                    unitCost: 100000,
                    warehouseName: 'Utama',
                },
            ],
            no: 'sku0002',
            unit1Name: 'PCS',
            unitPrice: 100000,
            tax1Id: 12,
        }
        chai.expect(mappedItem).to.deep.equal(expectedItem)
    })

    it('should return a mapped item when all attributes and category are exist', () => {
        itemMock.category = 'category_name'
        const mappedItem = accurateMapping.item(itemMock)
        delete itemMock.category
        const expectedItem = {
            itemType: 'INVENTORY',
            name: 'celana joger xl5 keren pake banget hehe 2',
            detailOpenBalance: [
                {
                    quantity: 0,
                    unitCost: 100000,
                    warehouseName: 'Utama',
                },
            ],
            no: 'sku0002',
            unit1Name: 'PCS',
            unitPrice: 100000,
            itemCategoryName: 'category_name',
        }
        chai.expect(mappedItem).to.deep.equal(expectedItem)
    })

    it('should return a mapped item when all attributes and barcode are exist', () => {
        itemMock.barcode = 'barcode'
        const mappedItem = accurateMapping.item(itemMock)
        delete itemMock.barcode
        const expectedItem = {
            itemType: 'INVENTORY',
            name: 'celana joger xl5 keren pake banget hehe 2',
            detailOpenBalance: [
                {
                    quantity: 0,
                    unitCost: 100000,
                    warehouseName: 'Utama',
                },
            ],
            no: 'sku0002',
            unit1Name: 'PCS',
            unitPrice: 100000,
            upcNo: 'barcode',
        }
        chai.expect(mappedItem).to.deep.equal(expectedItem)
    })

    it('should return a mapped item when all attributes and warehouseName are exist', () => {
        itemMock.warehouseName = 'Warehouse Keren'
        const mappedItem = accurateMapping.item(itemMock)
        const expectedItem = {
            itemType: 'INVENTORY',
            name: 'celana joger xl5 keren pake banget hehe 2',
            detailOpenBalance: [
                {
                    quantity: 0,
                    unitCost: 100000,
                    warehouseName: 'Warehouse Keren',
                },
            ],
            no: 'sku0002',
            unit1Name: 'PCS',
            unitPrice: 100000,
        }
        chai.expect(mappedItem).to.deep.equal(expectedItem)
    })

    it('should return an undefined mapped item when empty object passed', () => {
        const mappedItem = accurateMapping.item({})
        const expectedItem = {
            itemType: 'INVENTORY',
            name: undefined,
            detailOpenBalance: [
                {
                    quantity: 0,
                    unitCost: 0,
                    warehouseName: 'Utama',
                },
            ],
            no: undefined,
            unit1Name: 'PCS',
            unitPrice: 0,
        }
        chai.expect(mappedItem).to.deep.equal(expectedItem)
    })
})

describe('Order mapping testing', () => {
    it('should return a mapped order when all attributes are exist and new item exist', () => {
        orderMock.skus = []
        orderMock.taxable = false
        const result = accurateMapping.order(orderMock)
        const mappedOrder = result.mapped
        const expectedOrder = {
            customerNo: 1009,
            detailItem: [
                {
                    itemNo: 'sku0002',
                    unitPrice: 100000,
                    detailName:
                        'celana joger xl5 keren pake banget hehe 2 Variant Item',
                    detailNotes: '',
                    itemCashDiscount: 100,
                    quantity: 1,
                    useTax1: false,
                },
            ],
            transDate: '7/2/2022',
            cashDiscount: 2400,
            number: 35,
            taxable: false,
            toAddress:
                'Entis Sutisna Cirebon - Jalan Raya kertajaya Indah 97, Blok O-211',
        }
        const mappedItem = result.newItem
        const expectedItem = [
            {
                itemType: 'INVENTORY',
                name: 'celana joger xl5 keren pake banget hehe 2',
                detailOpenBalance: [{ quantity: 0, unitCost: 100000, warehouseName: 'Utama' },],
                no: 'sku0002',
                unit1Name: 'PCS',
                unitPrice: 100000,
                profile_id: 81,
            },
        ]
        chai.expect(mappedOrder).to.deep.equal(expectedOrder)
        chai.expect(mappedItem).to.deep.equal(expectedItem)
    })

    it("should return a mapped order when all attributes are exist and new item doesn't exist", () => {
        orderMock.skus = ['sku0002']
        const mappedOrder = accurateMapping.order(orderMock)
        const expectedOrder = {
            customerNo: 1009,
            detailItem: [
                {
                    itemNo: 'sku0002',
                    unitPrice: 100000,
                    detailName:
                        'celana joger xl5 keren pake banget hehe 2 Variant Item',
                    detailNotes: '',
                    itemCashDiscount: 100,
                    quantity: 1,
                    useTax1: false,
                },
            ],
            transDate: '7/2/2022',
            cashDiscount: 2400,
            number: 35,
            taxable: false,
            toAddress:
                'Entis Sutisna Cirebon - Jalan Raya kertajaya Indah 97, Blok O-211',
        }
        chai.expect(mappedOrder).to.deep.equal(expectedOrder)
    })

    it("should return a mapped order when all attributes are exist and shipping isn't cashless", () => {
        orderMock.skus = ['sku0002']
        orderMock.cashless = false
        orderMock.shippingAccountId = '2022'
        const mappedOrder = accurateMapping.order(orderMock)
        const expectedOrder = {
            customerNo: 1009,
            detailItem: [
                {
                    itemNo: 'sku0002',
                    unitPrice: 100000,
                    detailName:
                        'celana joger xl5 keren pake banget hehe 2 Variant Item',
                    detailNotes: '',
                    itemCashDiscount: 100,
                    quantity: 1,
                    useTax1: false,
                },
            ],
            transDate: '7/2/2022',
            cashDiscount: 2400,
            number: 35,
            taxable: false,
            toAddress:
                'Entis Sutisna Cirebon - Jalan Raya kertajaya Indah 97, Blok O-211',
            detailExpense: [
                {
                    accountId: '2022',
                    expenseAmount: 1200,
                    expenseName: 'JNT - JT123231',
                },
            ],
        }
        chai.expect(mappedOrder).to.deep.equal(expectedOrder)
    })

    it('should return a mapped order when all attributes and branchId are exist', () => {
        orderMock.skus = ['sku0002']
        orderMock.branchId = 50
        orderMock.cashless = true
        const mappedOrder = accurateMapping.order(orderMock)
        const expectedOrder = {
            customerNo: 1009,
            detailItem: [
                {
                    itemNo: 'sku0002',
                    unitPrice: 100000,
                    detailName:
                        'celana joger xl5 keren pake banget hehe 2 Variant Item',
                    detailNotes: '',
                    itemCashDiscount: 100,
                    quantity: 1,
                    useTax1: false,
                },
            ],
            transDate: '7/2/2022',
            cashDiscount: 2400,
            number: 35,
            taxable: false,
            toAddress:
                'Entis Sutisna Cirebon - Jalan Raya kertajaya Indah 97, Blok O-211',
            branchId: 50,
        }
        chai.expect(mappedOrder).to.deep.equal(expectedOrder)
    })

    it('should throw an error when empty object passed', () => {
        chai.expect(() => accurateMapping.order({})).to.throw(TypeError)
    })
})

describe('Invoice mapping testing', () => {
    it('should return a mapped invoice when all attributes are exist', () => {
        delete orderMock.branchId
        const mappedInvoice = accurateMapping.invoice(orderMock)
        const expectedInvoice = {
            customerNo: 1009,
            detailItem: [
                {
                    itemNo: 'sku0002',
                    unitPrice: 100000,
                    detailName:
                        'celana joger xl5 keren pake banget hehe 2 Variant Item',
                    detailNotes: '',
                    itemCashDiscount: 100,
                    quantity: 1,
                    salesOrderNumber: 35,
                    useTax1: false,
                },
            ],
            transDate: '7/2/2022',
            cashDiscount: 2400,
            taxable: false,
            toAddress:
                'Entis Sutisna Cirebon - Jalan Raya kertajaya Indah 97, Blok O-211',
        }
        chai.expect(mappedInvoice).to.be.deep.equal(expectedInvoice)
    })

    it("should return a mapped invoice when all attributes are exist and shipping isn't cashless", () => {
        orderMock.skus = ['sku0002']
        orderMock.cashless = false
        orderMock.shippingAccountId = '2022'
        const mappedInvoice = accurateMapping.invoice(orderMock)
        const expectedInvoice = {
            customerNo: 1009,
            detailItem: [
                {
                    itemNo: 'sku0002',
                    unitPrice: 100000,
                    detailName:
                        'celana joger xl5 keren pake banget hehe 2 Variant Item',
                    detailNotes: '',
                    itemCashDiscount: 100,
                    quantity: 1,
                    salesOrderNumber: 35,
                    useTax1: false,
                },
            ],
            transDate: '7/2/2022',
            cashDiscount: 2400,
            taxable: false,
            toAddress:
                'Entis Sutisna Cirebon - Jalan Raya kertajaya Indah 97, Blok O-211',
            detailExpense: [
                {
                    accountId: '2022',
                    expenseAmount: 1200,
                    expenseName: 'JNT - JT123231',
                },
            ],
        }
        chai.expect(mappedInvoice).to.deep.equal(expectedInvoice)
    })

    it('should return a mapped invoice when all attributes and branchId are exist', () => {
        orderMock.skus = ['sku0002']
        orderMock.branchId = 50
        orderMock.cashless = true
        const mappedInvoice = accurateMapping.invoice(orderMock)
        const expectedInvoice = {
            customerNo: 1009,
            detailItem: [
                {
                    itemNo: 'sku0002',
                    unitPrice: 100000,
                    detailName:
                        'celana joger xl5 keren pake banget hehe 2 Variant Item',
                    detailNotes: '',
                    itemCashDiscount: 100,
                    quantity: 1,
                    salesOrderNumber: 35,
                    useTax1: false,
                },
            ],
            transDate: '7/2/2022',
            cashDiscount: 2400,
            taxable: false,
            toAddress:
                'Entis Sutisna Cirebon - Jalan Raya kertajaya Indah 97, Blok O-211',
            branchId: 50,
        }
        chai.expect(mappedInvoice).to.be.deep.equal(expectedInvoice)
    })

    it('should throw an error when empty object passed', () => {
        chai.expect(() => accurateMapping.invoice({})).to.throw(TypeError)
    })
})

describe('Receipt mapping testing', () => {
    it('should return a mapped receipt when all attributes are exist', () => {
        delete orderMock.branchId
        orderMock.accountNo = '2020'
        orderMock.invoice = {
            number: 20,
        }
        const mappedReceipt = accurateMapping.receipt(orderMock)
        const expectedReceipt = {
            bankNo: '2020',
            chequeAmount: 197600,
            customerNo: 1009,
            detailInvoice: [{ invoiceNo: 20, paymentAmount: 197600 }],
            transDate: '7/2/2022',
        }
        chai.expect(mappedReceipt).to.be.deep.equal(expectedReceipt)
    })

    it("should return a mapped receipt when all attributes are exist and shipping isn't cashless", () => {
        orderMock.skus = ['sku0002']
        orderMock.cashless = false
        orderMock.shippingAccountId = '2022'
        const mappedReceipt = accurateMapping.receipt(orderMock)
        const expectedReceipt = {
            bankNo: '2020',
            chequeAmount: 198800,
            customerNo: 1009,
            detailInvoice: [{ invoiceNo: 20, paymentAmount: 198800 }],
            transDate: '7/2/2022',
        }
        chai.expect(mappedReceipt).to.deep.equal(expectedReceipt)
    })

    it('should return a mapped receipt when all attributes and branchId are exist', () => {
        orderMock.skus = ['sku0002']
        orderMock.branchId = 50
        orderMock.cashless = true
        const mappedReceipt = accurateMapping.receipt(orderMock)
        const expectedReceipt = {
            bankNo: '2020',
            chequeAmount: 197600,
            customerNo: 1009,
            detailInvoice: [{ invoiceNo: 20, paymentAmount: 197600 }],
            transDate: '7/2/2022',
            branchId: 50,
        }
        chai.expect(mappedReceipt).to.be.deep.equal(expectedReceipt)
    })

    it('should throw an error when empty object passed', () => {
        chai.expect(() => accurateMapping.receipt({})).to.throw(TypeError)
    })
})
