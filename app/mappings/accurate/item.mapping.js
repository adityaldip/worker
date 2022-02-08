
/**
 * Mapping item
 * @param {Object} item Item to map
 * @returns {Object}    Mapped item object for Accurate
 */
const itemMapping = (item) => {
    const mapped = {
        itemType: 'INVENTORY', // required; INVENTORY
        name: item.name, // required; item_lines.name
        detailOpenBalance: [
            {
                quantity: parseInt(item.qty || 0),
                unitCost: item.price || item.total_price || 0,
                warehouseName: item.warehouseName || 'Utama',
            }
        ],
        no: item.sku, // item_lines.sku
        unit1Name: 'PCS',
        unitPrice: item.price || item.total_price || 0, // item_lines.price
    }

    if (item.cost_price) {
        mapped.vendorPrice = item.cost_price;
    }

    if (item.taxName) {
        mapped.tax1Name = item.taxName;
    }
    
    if (item.category) {
        mapped.itemCategoryName = item.category;
    }

    if (item.barcode) {
        mapped.upcNo = item.barcode;
    }

    return mapped;
}

module.exports = itemMapping
