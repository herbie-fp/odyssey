const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const AdmZip = require('adm-zip');

const downloadFile = async (uri, dest, maxRedirects = 10) => {
  const parsedUrl = new URL(uri);
  const protocol = parsedUrl.protocol === 'https:' ? https : http;

  const handleRedirects = async (res, redirectsLeft) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      if (redirectsLeft > 0) {
        const newUrl = new URL(res.headers.location, uri).href;
        console.log(`Redirecting to ${newUrl}`);
        return await downloadFile(newUrl, dest, redirectsLeft - 1);
      } else {
        throw new Error('Too many redirects');
      }
    } else if (res.statusCode === 200) {
      const file = fs.createWriteStream(dest);
      return new Promise((resolve, reject) => {
        res.pipe(file);
        file.on('finish', () => {
          file.close((err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      });
    } else {
      throw new Error(`Failed to get '${uri}' (${res.statusCode})`);
    }
  };

  return await (new Promise((resolve, reject) => {
    const request = protocol.get(uri, async (response) => {
      try {
        await handleRedirects(response, maxRedirects);
        resolve();
      } catch (err) {
        reject(err);
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  }));
};

const unzipFile = (zipPath, outPath) => {
  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(outPath, true);
    fs.unlinkSync(zipPath);
  } catch (err) {
    throw new Error(`Failed to unzip file: ${err.message}`);
  }
};

const main = async () => {
  const uri = process.argv[2];
  const outPath = process.argv[3];

  if (!uri || !outPath) {
    console.error('Usage: node script.js <URI> <OUT_PATH>');
    process.exit(1);
  }

  const zipPath = path.join(outPath, 'downloaded.zip');

  try {
    fs.mkdirSync(outPath, { recursive: true });
    await downloadFile(uri, zipPath);
    console.log('Downloaded file');
    unzipFile(zipPath, outPath);
    console.log('Unzipped file');
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
};

main();
