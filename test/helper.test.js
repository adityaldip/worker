const GeneralHelper = require('../app/helpers/general.helper');

const chai = require('chai');
const helper = new GeneralHelper()

describe('Date converter helper testing', () => {

    it('should return date with d/m/Y format', () => {
        const date = new Date(2000, 3, 21)
        const convertedDate = helper.dateConvert(date);
        const expectedDate = '21/4/2000'

        chai.expect(convertedDate).to.equal(expectedDate)
    })

    it('should return 1/1/1970 if null passed', () => {
        const convertedDate = helper.dateConvert(null);
        const expectedDate = '1/1/1970'

        chai.expect(convertedDate).to.equal(expectedDate)
    })

    it('should return NaN/NaN/NaN if undefined passed', () => {
        const convertedDate = helper.dateConvert(undefined);
        const expectedDate = 'NaN/NaN/NaN'

        chai.expect(convertedDate).to.equal(expectedDate)
    })

    it('should return NaN/NaN/NaN if nothing passed', () => {
        const convertedDate = helper.dateConvert();
        const expectedDate = 'NaN/NaN/NaN'

        chai.expect(convertedDate).to.equal(expectedDate)
    })

})
