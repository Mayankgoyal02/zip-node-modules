import axios from "axios";
import dotenv from 'dotenv'
dotenv.config({
    path: ".env"
})
 
// Base URL for the Azure Pricing API
const baseUrl = "https://prices.azure.com/api/retail/prices";
//SNOW Cloud Resource Costs table API url
const snowUrl =
    `${process.env.SNOW_COST_TABLE}`;
//axios auth for snow
const options = {
    auth: {
 
        username: process.env.SNOW_USER,
        password: process.env.SNOW_PASS,
    }
};
 
const getSQLServerFilter = (region) => {
    /*
     * This function will get the filter for the keyVault
     * @param {string} region - The region of the keyVault
     * @returns {string} - The filter string for the keyVault
     */
 
    let filters = `productName eq 'SQL Database' and serviceName eq 'SQL Database' and armRegionName eq '${region}'and type eq 'Consumption'`;
    return filters
};
 
 
 
 
async function getSQLServerPrice(filters) {
    /*
     * This function will get the price of the KeyVault
     * @param {string} filters - The filter for the KeyVault
     * @returns {Array} - The price list of the KeyVault
     * @throws {error} - The error message
     * @throws {AxiosError} - The error message from the Axios request
     */
    try {
        const res = await axios.get(`${baseUrl}?$filter=${filters}`);
        const data = res.data.Items;
        return data;
    } catch (error) {
        console.log(error);
    }
}
 
async function createSQLServerRecord(region) {
    /*
     * This function will create the KeyVault record
     * @param {string} sku - The SKU of the KeyVault
     * @param {string} region - The region of the KeyVault
     * @param {string} os - The operating system of the virtual
     * @returns {boolean} - The status of the record creation
     */
    const filters = getSQLServerFilter(region);
   
    try {
        const res = await getSQLServerPrice(filters);
        console.log(res)
    } catch (error) {
        console.log(error)
     }
   
}
 
 
export {
    getSQLServerPrice,
    getSQLServerFilter,
    createSQLServerRecord,
};
 
createSQLServerRecord("eastus2")
