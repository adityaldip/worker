
/**
 * Mapping item
 * @param {Object} item Item to map
 * @returns {Object}    Mapped item object for Accurate
 */
const itemMapping = (item) => {
    const mapped = {
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
        detailOpenBalance: [
            {
                // _status: 'delete',
                // asOf: '',
                // detailSerialNumber: [
                //     {
                //         _status: 'delete',
                //         expiredDate: '',
                //         id: 1,
                //         quantity: 1,
                //         serialNumberNo: '',
                //     }
                // ],
                // id: 1,
                // itemUnitName: '',
                quantity: item.qty || 0,
                unitCost: item.price || item.total_price || 0,
                warehouseName: item.warehouseName || 'Utama',
            }
        ],
        // goodTransitGlAccountNo: '',
        // id: 1,
        // inventoryGlAccountNo: '',
        // itemCategoryName: '',
        // manageExpired: false,
        // manageSN: false,
        // minimumQuantity: 10,
        // minimumQuantityReorder: 10,
        no: item.sku, // item_lines.sku
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
        unit1Name: 'PCS',
        // unit2Name: '',
        // unit2Price: 1,
        // unit3Name: '',
        // unit3Price: 1,
        // unit4Name: '',
        // unit4Price: 1,
        // unit5Name: '',
        // unit5Price: 1,
        unitPrice: item.price || item.total_price || 0, // item_lines.price
        // upcNo: item.barcode, // item_lines.id
        vendorPrice: item.price || item.total_price || 0,
        // vendorUnitName: '',
    }

    if (item.taxName) {
        mapped.tax1Name = item.taxName;
    }
    
    if (item.barcode) {
        mapped.upcNo = item.barcode;
    }

    return mapped;
}

module.exports = itemMapping
