const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Initialize a new zip instance
const zip = new AdmZip();
const rootDir = __dirname;
const outputZipPath = path.join(rootDir, 'project.zip');

// Function to add files and directories to the zip archive
function addFolderToZip(folderPath, zipFolderPath = '') {
    try {
        const files = fs.readdirSync(folderPath);
        files.forEach(file => {
            const filePath = path.join(folderPath, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // Recursively add subdirectories
                const newZipFolderPath = path.join(zipFolderPath, file);
                addFolderToZip(filePath, newZipFolderPath);
            } else {
                // Add files to the zip
                zip.addLocalFile(filePath, zipFolderPath);
            }
        });
    } catch (err) {
        console.error(`Error processing directory ${folderPath}: ${err.message}`);
    }
}

// Start adding files and directories to the zip
console.log('Starting zipping process...');
try {
    addFolderToZip(rootDir);

    // Save the zip file
    zip.writeZip(outputZipPath);
    console.log(`Zip file created successfully at ${outputZipPath}.`);
} catch (err) {
    console.error(`Error during zipping process: ${err.message}`);
}
