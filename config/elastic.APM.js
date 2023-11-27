const apm = require('elastic-apm-node')
    
const init = async()=>{
    if(!global.pm){
        global.pm =  apm.start({
            serviceName: 'accurate_worker',
            
            secretToken: process.env.APM_SECRET_TOKEN || 'VRIRaPt5g4TD8jfwAj',
            
            serverUrl: process.env.APM_SERVER_URL || 'https://2449190ec8db4b19bfd745112fd94a28.apm.southeastasia.azure.elastic-cloud.com:443',
            
            environment: process.env.APM_ENVIRONMENT || 'azure-polling'
        })
        // console.log(this.pm)
    }
    return global.pm
}
const getAPM = async()=>
    //    console.log(this.pm)
    global.pm
    


module.exports = {init, getAPM}