const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

const output = fs.createWriteStream(path.join(__dirname, 'project.zip'));
const archive = archiver('zip', {
    zlib: { level: 1 } // Sets the compression level.
});

output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.log('Zip file created successfully.');
});

archive.on('error', function(err) {
    throw err;
});

archive.pipe(output);

// Append files from the root directory and node_modules
archive.directory(__dirname, false);

archive.finalize();
