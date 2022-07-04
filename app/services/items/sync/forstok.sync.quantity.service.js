const syncQuantity = async (id) => {
    try {
        console.log('id: ' + id)
    } catch (error) {
        console.error(' [x] Error: %s', error.message)
    }
}

module.exports = syncQuantity
