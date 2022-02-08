// const chai = require('chai');
// const mongo = require('mongodb');
// const customerMapping = require('../app/mappings/customer.mapping');

// const OrderModel = require('../app/models/order.model');
// const SellerModel = require("../app/models/seller.model")

// const sellerModel = new SellerModel();
// const orderModel = new OrderModel();

// describe('Sync Open Order Service', () => {
    
//     it('should return an order object', async () => {
//         const order = await orderModel.findBy({_id: new mongo.ObjectId('61cbef7dbbfbdf15949305a9')});
//         chai.expect(order).to.be.an('object')
//     })
    
//     it('should return a seller account', async () => {
//         const order = await orderModel.findBy({_id: new mongo.ObjectId('61cbef7dbbfbdf15949305a9')});
//         const seller = await sellerModel.findBy({ seller_id: order.profile_id });
//         chai.expect(seller).to.be.an('object');
//     })
    
//     it('should return seller chart of accounts', async () => {
//         const order = await orderModel.findBy({_id: new mongo.ObjectId('61cbef7dbbfbdf15949305a9')});
//         // console.log(order);
//         const seller = await sellerModel.findBy({ seller_id: order.profile_id });
//         // console.log(seller);
//         chai.expect(seller.customers).to.be.an('array');
//     })
// })

// describe('customerService()', () => {
//     const order = {
//         _id: "61cbef7dbbfbdf15949305a9",
//         id: 115724824,
//         status: 'Open',
//         channel: 'shopify',
//         channel_id: 2,
//         local_id: '4082828410950',
//         local_name: '4082828410950',
//         store_name: 'New Axis Store',
//         store_id: 7475,
//         profile_id: 747,
//         address: {
//           address_1: '199 Lafayette St.',
//           address_2: 'Central Perk',
//           city: '',
//           country: 'Indonesia',
//           name: 'Chandler Bing',
//           phone: '',
//           postal_code: '',
//           province: 'Jakarta',
//           province_code: 'JK',
//           sub_district: '',
//           district: '',
//           coordinate: null
//         },
//         customer_info: {
//           id: 44697474,
//           name: 'Chandler Bing',
//           email: 'bing.chandler@gmail.com',
//           customer_since: '2021-12-24T15:00:45.000+07:00'
//         },
//         dropshipper_info: null,
//         ordered_at: '2021-12-29T12:09:00.000+07:00',
//         created_at: '2021-12-29T12:09:05.000+07:00',
//         updated_at: '2021-12-31T11:44:57.000+07:00',
//         item_lines: [
//           {
//             id: 93347798,
//             local_id: '10485119025222',
//             sku: 'freebies-slow-acid',
//             name: 'Freebies Slow Acid',
//             variant_name: '',
//             variant_id: 16860617,
//             variant_sku: 'freebies-slow-acid',
//             price: 10,
//             sale_price: null,
//             total_price: 10,
//             voucher_amount: 0,
//             voucher_code: null,
//             voucher_platform: 0,
//             voucher_seller: 0,
//             tax_price: 0,
//             fulfill_by_channel: false,
//             shipping_provider: null,
//             shipping_provider_type: null,
//             tracking_number: null,
//             note: null,
//             internal_note: null,
//             bundle_info: []
//           }
//         ],
//         payment: { payment_method: null, status: 'Payment Verified' },
//         shipping_price: 0,
//         disc_shipping_seller: 0,
//         disc_shipping_platform: 0,
//         shipping_courier: {
//           providers: [],
//           delivery_type: 'PICKUP',
//           delivery_info: '-',
//           awb: null,
//           document_path: '',
//           booking_code: null,
//           channel_docs_path: null,
//           logistic_destination_code: null
//         },
//         shipping_provider: null,
//         shipping_provider_type: null,
//         shipping_description: null,
//         subtotal: 10,
//         channel_rebate: 0,
//         cashless: false,
//         discount_amount: 0,
//         total_price: 10,
//         insurance_fee: 0,
//         discount_reason: null,
//         tax_price: 0,
//         warehouse_id: 834,
//         cod: false,
//         warehouse_code: '',
//         note: null,
//         internal_note: null,
//         returns: [],
//         synced: false
//     };

//     describe('customerMapping()', () => {
//       const expectedCustomer = { name: 'New Axis Store', transDate: '29/12/2021', customerNo: 7475 };
        
//         it('should return a mapped customer when order is complete', () => {
//           customer = customerMapping(order);
//           chai.expect(customerMapping(order)).to.be.an('object');
//           chai.expect(customer.name).to.equal(expectedCustomer.name);
//           chai.expect(customer.transDate).to.equal(expectedCustomer.transDate);
//           chai.expect(customer.customerNo).to.equal(expectedCustomer.customerNo);
//         })

//         it('should throw TypeError when order is null', () => {
//           chai.expect(() => customerMapping(null)).to.throw(TypeError)
//         });

//         it('should throw TypeError when order.store_name is null', () => {
//           console.log(customerMapping({ store_name: "cek" }));
//           chai.expect(() => customerMapping({ store_name: "cek" })).to.throw('Error')
//         });
//     })
    
    
// })
