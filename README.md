[![JSR](https://jsr.io/badges/@nekz/b2)](https://jsr.io/@nekz/b2)
[![JSR Score](https://jsr.io/badges/@nekz/b2/score)](https://jsr.io/@nekz/b2)

# b2

JavaScript module for accessing the [Backblaze B2 Cloud Storage] API.

[Backblaze B2 Cloud Storage]: https://www.backblaze.com/docs/cloud-storage

## Usage

### Authorization

```ts
import { BackblazeClient } from '@nekz/b2';

const b2 = new BackblazeClient({
    userAgent: 'my-application/1.0.0',
});

// Set up a bucket:
//      https://secure.backblaze.com/b2_buckets.htm
const B2_BUCKET_ID = Deno.env.get('B2_BUCKET_ID')!;

// Access bucket via an application key:
//      https://secure.backblaze.com/app_keys.htm
await b2.authorizeAccount({
    applicationKeyId: Deno.env.get('B2_APP_KEY_ID')!,
    applicationKey: Deno.env.get('B2_APP_KEY')!,
});
```

### Upload a file

```ts
// Get contents from file here etc.
const fileName = crypto.randomUUID();
const fileContents = new TextEncoder()
    .encode(new Date().toISOString());

// Optional: Set a readable file name via Content-Disposition
//           Header when expecting downloads from browsers
const downloadFileName = 'test.txt';

const upload = await b2.uploadFile({
    bucketId: B2_BUCKET_ID,
    fileName,
    fileContents,
    contentType: 'text/plain',
    contentDisposition: `attachment; filename="${encodeURIComponent(downloadFileName)}"`,
});

// Construct a direct download link to the file
const downloadUrl = b2.getDownloadUrl(upload.fileName);

console.log(downloadUrl);
```

## License

[MIT License](./LICENSE)
