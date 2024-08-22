const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Create a file to stream archive data to.
const output = fs.createWriteStream(path.join(__dirname, 'project.zip'));
const archive = archiver('zip', {
    zlib: { level: 9 }  // Set compression level (0-9)
});

// Listen for all archive data to be written
output.on('close', function () {
    console.log(`Archive created successfully. Total bytes: ${archive.pointer()}`);
});

archive.on('error', function(err) {
    throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Recursively add files and directories to the archive
async function addFolderToZip(folderPath, archive, folderInZip) {
    try {
        const files = fs.readdirSync(folderPath);
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // Add directory to the archive
                console.log(`Adding directory: ${filePath}`);
                archive.directory(filePath, path.join(folderInZip, file));
                // Recursively add subdirectories
                await addFolderToZip(filePath, archive, path.join(folderInZip, file));
            } else {
                // Add file to the archive
                console.log(`Adding file: ${filePath}`);
                archive.file(filePath, { name: path.join(folderInZip, file) });
            }
        }
    } catch (err) {
        console.error(`Error processing directory ${folderPath}: ${err.message}`);
    }
}

// Start adding files and directories to the archive
console.log('Starting zipping process...');
addFolderToZip(__dirname, archive, '').then(() => {
    // Finalize the archive (i.e., the zip file)
    archive.finalize();
}).catch(err => {
    console.error(`Error during zipping process: ${err.message}`);
});
