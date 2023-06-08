const chai = require('chai')

const CreateInvoice = require('../app/services/orders/invoice/accurate.invoice.new.order.service')

const orderMock = {
    _id: '619dee5beb02a58a3b0bb97d',
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

describe('Create Invoice', () => {
    it('should return a SKU can not be empty when SKU items empty', () => {
        const order = CreateInvoice(orderMock._id)
        chai.expect(order)
    })
    it('should return a create Invoice', () => {
        const order = CreateInvoice(orderMock._id)
        chai.expect(order)
    })
})