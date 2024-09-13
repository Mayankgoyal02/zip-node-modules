const axios = require('axios');


const azurePricingUrl = 'https://prices.azure.com/api/retail/prices';


async function getAzureSQLPricing() {
  try {
    
    const queryParams = {
      currencyCode: 'INR',
      armRegionName: 'eastus2',
      serviceName: 'SQL Database',
      productName: 'SQL Database',
      priceType: 'Consumption'
    };

    
    const response = await axios.get(azurePricingUrl, { params: queryParams });

    
    const sqlPricing = response.data.Items.filter(item => item.unitOfMeasure === '1 Hour');

   
    sqlPricing.forEach(priceItem => {
      console.log(`Tier: ${priceItem.skuName}`);
      console.log(`Region: ${priceItem.armRegionName}`);
      console.log(`Price per Hour: ${priceItem.retailPrice} ${priceItem.currencyCode}`);
      console.log('----------------------------------');
    });
  } catch (error) {
    console.error('Error fetching Azure SQL Database pricing:', error.message);
  }
}


getAzureSQLPricing();
