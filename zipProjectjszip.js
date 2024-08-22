const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

// Create a new instance of JSZip
const zip = new JSZip();
const rootDir = __dirname;

// Function to add files and directories to the zip archive
function addFolderToZip(folderPath, zipFolder) {
    try {
        const files = fs.readdirSync(folderPath);
        files.forEach(file => {
            const filePath = path.join(folderPath, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                // Recursively add subdirectories
                const newZipFolder = zipFolder.folder(file);
                addFolderToZip(filePath, newZipFolder);
            } else {
                // Add files to the zip
                zipFolder.file(file, fs.readFileSync(filePath));
            }
        });
    } catch (err) {
        console.error(`Error processing directory ${folderPath}: ${err.message}`);
    }
}

// Start adding files and directories to the zip
console.log('Starting zipping process...');
addFolderToZip(rootDir, zip);
console.log('Added files to zip. Generating zip file...');

// Generate the zip file and save it to disk
zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
   .pipe(fs.createWriteStream(path.join(rootDir, 'project.zip')))
   .on('finish', function () {
       console.log('Zip file created successfully.');
   })
   .on('error', function (err) {
       console.error(`Error creating zip file: ${err.message}`);
   });
