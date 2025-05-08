const Provider = require('./provider');
const uploadDir = process.env.S3_UPLOAD_DIR || `uploads`;
const bucket = process.env.S3_BUCKET || '';
const region = process.env.S3_REGION || ''
const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");
const fs = require('fs-extra');
const { v4: uuid } = require('uuid');
const { formatUrl } = require("@aws-sdk/util-format-url");
const { Request } = require('node-fetch');

const config = {
  region: region
}

const s3client = new S3Client(config);

class S3Provider extends Provider {
  static upload(file, dir) {
    const data = fs.createReadStream(file.path);
    
    const uniqueName = `${uuid()}-${file.originalname}`

    const key = `${uploadDir}/${dir ? `${dir}/${uniqueName}` : `${uniqueName}`}`;

    const command = new PutObjectCommand({
      "Body": data,
      "Bucket": bucket,
      "Key": key
    })

    const firstPromise = s3client.send(command).then( (response) => {
      const encodedKey = encodeURIComponent(key);

      // here should go the url to this server to download the file
      file.url = `/${encodedKey}`;

      file.bucket = bucket;

      const promise = new Promise((resolve) => resolve(file))
      return promise
    } )
    
    return firstPromise
  }

  static download(path, req, res) {
    const command = new GetObjectCommand({ Bucket: bucket, Key: path });
    
    getSignedUrl(s3client, command, { expiresIn: 3600 }).then(signedUrl => res.redirect(signedUrl));
  }

  static delete(path, req, res) {
    const command = new DeleteObjectCommand({ Bucket: bucket, Key: path });
    
    s3client.send(command).then(()=>res.send('Done'));
  }
}

module.exports = S3Provider;
