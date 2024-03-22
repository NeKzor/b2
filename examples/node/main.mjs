import { BackblazeClient } from "@nekz/b2";
import { TextEncoder } from 'node:util';

const B2_BUCKET_ID = process.env.B2_BUCKET_ID;
const B2_APP_KEY_ID = process.env.B2_APP_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;
const USER_AGENT = process.env.USER_AGENT;

const b2 = new BackblazeClient({
    userAgent: USER_AGENT,
});

const auth = await b2.authorizeAccount({
    applicationKeyId: B2_APP_KEY_ID,
    applicationKey: B2_APP_KEY,
});

const fileName = crypto.randomUUID();
const downloadFileName = 'text.txt';
const fileContents = new TextEncoder().encode(new Date().toISOString());

const upload = await b2.uploadFile({
    bucketId: B2_BUCKET_ID,
    fileName,
    fileContents,
    contentType: 'text/plain',
    contentDisposition: `attachment; filename="${encodeURIComponent(downloadFileName)}"`,
});

const downloadUrl = b2.getDownloadUrl(upload.fileName);

console.log({ downloadUrl });
