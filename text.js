const fs = require('fs');
const path = require('path');


const x = 'hellomayank22';

const tfFilePath = path.join(__dirname, 'test.tf');  // Replace with your actual Terraform file name


fs.readFile(tfFilePath, 'utf-8', (err, data) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }

    // Regex to match the depends_on array
    const dependsOnRegex = /depends_on\s*=\s*\[(.*?)\]/s;

    // Check if depends_on exists and is an array
    const match = data.match(dependsOnRegex);

    let updatedDependsOn;
    if (match) {
        // depends_on exists, parse current values and add x
        let currentValues = match[1].trim();

        // Check if current values are empty
        if (currentValues) {
            // Add the new value to the existing list, ensuring commas are correct
            updatedDependsOn = `depends_on = [${currentValues}, "${x}"]`;
        } else {
            // No values present, add x directly
            updatedDependsOn = `depends_on = ["${x}"]`;
        }
    } else {
        // depends_on does not exist, create it with x
        updatedDependsOn = `depends_on = ["${x}"]`;
    }

    // Replace the old depends_on array with the updated one in the file content
    const updatedData = data.replace(dependsOnRegex, updatedDependsOn);

    // Write the modified content back to the Terraform file
    fs.writeFile(tfFilePath, updatedData, 'utf-8', (err) => {
        if (err) {
            console.error('Error writing the file:', err);
            return;
        }
        console.log('Terraform file updated successfully with new depends_on value.');
    });
});
