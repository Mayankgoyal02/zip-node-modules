import axios from "axios";
import dotenv from 'dotenv'
dotenv.config({
    path: ".env"
})

// Base URL for the Azure Pricing API
const baseUrl = "https://prices.azure.com/api/retail/prices";
// SNOW Cloud Resource Costs table API URL
const snowUrl = `${process.env.SNOW_COST_TABLE}`;

// Axios auth options for Snow
const options = {
    auth: {
        username: process.env.SNOW_USER,
        password: process.env.SNOW_PASS,
    }
};

const getSQLServerFilter = (region) => {
    /*
     * This function gets the filter for SQL Server
     * @param {string} region - The region of the SQL Server
     * @returns {string} - The filter string for the SQL Server
     */
    let filters = `productName eq 'SQL Database' and serviceName eq 'SQL Database' and armRegionName eq '${region}' and type eq 'Consumption'`;
    return filters;
};

async function getSQLServerPrice(filters) {
    /*
     * This function gets the price of the SQL Server
     * @param {string} filters - The filter for the SQL Server
     * @returns {Array} - The price list of the SQL Server
     */
    try {
        const res = await axios.get(`${baseUrl}?$filter=${filters}`);
        
        // Log the full response for debugging
        console.log('Response Status:', res.status);
        console.log('Response Data:', res.data);

        const data = res.data.Items;

        // Check if items are empty and log the filter
        if (data.length === 0) {
            console.log(`No data returned for filters: ${filters}`);
        }
        
        return data;
    } catch (error) {
        // Log detailed error message
        console.error('Error fetching SQL Server prices:', error.message);
    }
}

async function createSQLServerRecord(region) {
    /*
     * This function creates the SQL Server record
     * @param {string} region - The region of the SQL Server
     */
    const filters = getSQLServerFilter(region);
    
    try {
        const res = await getSQLServerPrice(filters);
        console.log('Pricing Details:', res);
    } catch (error) {
        console.error('Error creating SQL Server record:', error.message);
    }
}

// Export functions
export {
    getSQLServerPrice,
    getSQLServerFilter,
    createSQLServerRecord,
};

// Test the function with "eastus2" region
createSQLServerRecord("eastus2");
