const itemMapping = (item) => {
    return {
        itemType: 'INVENTORY', // required; INVENTORY
        name: item.name, // required; item_lines.name
        // calculateGroupPrice: false,
        // cogsGlAccountNo: '',
        // controlQuality: true,
        // defaultDiscount: '',
        // detailGroup: [
        //     {
        //         _status: 'delete',
        //         detailName: '',
        //         id: 1,
        //         itemNo: '',
        //         itemUnitName: '',
        //         quantity: 1,
        //     }
        // ],
        // detailOpenBalance: [
        //     {
        //         _status: 'delete',
        //         asOf: '',
        //         detailSerialNumber: [
        //             {
        //                 _status: 'delete',
        //                 expiredDate: '',
        //                 id: 1,
        //                 quantity: 1,
        //                 serialNumberNo: '',
        //             }
        //         ],
        //         id: 1,
        //         itemUnitName: '',
        //         quantity: 1,
        //         unitCost: 9000,
        //         warehouseName: '',
        //     }
        // ],
        // goodTransitGlAccountNo: '',
        // id: 1,
        // inventoryGlAccountNo: '',
        // itemCategoryName: '',
        // manageExpired: false,
        // manageSN: false,
        // minimumQuantity: 10,
        // minimumQuantityReorder: 10,
        no: item.id, // item_lines.id
        // notes: '',
        // percentTaxable: 100,
        // preferedVendorName: '',
        // printDetailGroup: false,
        // purchaseRetGlAccountNo: '',
        // ratio2: 10,
        // ratio3: 10,
        // ratio4: 10,
        // ratio5: 10,
        // salesDiscountGlAccountNo: '',
        // salesGlAccountNo: '',
        // salesRetGlAccountNo: '',
        // serialNumberType: '',
        // substituted: false,
        // substitutedItemNo: '',
        // tax1Name: '',
        // tax2Name: '',
        // tax3Name: '',
        // tax4Name: '',
        // typeAutoNumber: 1,
        // unBilledGlAccountNo: '',
        // unit1Name: '',
        // unit2Name: '',
        // unit2Price: 1,
        // unit3Name: '',
        // unit3Price: 1,
        // unit4Name: '',
        // unit4Price: 1,
        // unit5Name: '',
        // unit5Price: 1,
        unitPrice: item.price, // item_lines.price
        upcNo: item.sku, // item_lines.sku
        // vendorPrice: 1,
        // vendorUnitName: '',
    }
};

module.exports = itemMapping;