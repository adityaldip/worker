const MessageBroker = require('../../config/rabbitmq');

class GeneralHelper{

    async pubQueue(queue, message){
        try {
            const broker = await MessageBroker.getInstance();
            await broker.send(
                queue,
                Buffer.from(JSON.stringify(message)),
            );
        } catch (error) {
            
        }
    }

    dateConvert(date) {
        const _date = new Date(date);
        return _date.getDate() + "/" + (_date.getMonth() + 1) + "/" + _date.getFullYear();
    }

}

module.exports = GeneralHelper;