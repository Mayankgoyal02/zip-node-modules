const fs = require('fs-extra');
const archiver = require('archiver');
const path = require('path');

// Function to zip a directory
function zipDirectory(sourceDir, outPath) {
  const archive = archiver('zip', { zlib: { level: 9 } }); // Set the compression level
  const stream = fs.createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on('error', err => reject(err))
      .pipe(stream);

    stream.on('close', () => resolve());
    archive.finalize();
  });
}

// Define the source directory and output zip file
const directoryToZip = path.resolve(__dirname, 'your_directory_name'); // Replace with your directory name
const outputZipFile = path.resolve(__dirname, 'output.zip');

// Call the zip function
zipDirectory(directoryToZip, outputZipFile)
  .then(() => console.log('Directory successfully zipped'))
  .catch(err => console.error('Error zipping directory:', err));
