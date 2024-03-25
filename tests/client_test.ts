// Copyright (c) 2024, NeKz
// SPDX-License-Identifier: MIT

import { BackblazeClient } from '../src/mod.ts';
import { assert, assertEquals } from 'jsr:@std/assert';

const B2_BUCKET_ID = Deno.env.get('B2_BUCKET_ID')!;
const B2_APP_KEY_ID = Deno.env.get('B2_APP_KEY_ID')!;
const B2_APP_KEY = Deno.env.get('B2_APP_KEY')!;
const USER_AGENT = Deno.env.get('USER_AGENT')!;

assert(B2_BUCKET_ID);
assert(B2_APP_KEY_ID);
assert(B2_APP_KEY);
assert(USER_AGENT);

Deno.test('BackblazeClient', async (t) => {
    const b2 = new BackblazeClient({
        userAgent: USER_AGENT,
    });

    const auth = await b2.authorizeAccount({
        applicationKeyId: B2_APP_KEY_ID,
        applicationKey: B2_APP_KEY,
    });

    assert(auth);
    assert(auth.accountId);
    assert(auth.apiInfo);
    assertEquals(auth.applicationKeyExpirationTimestamp, null);
    assert(auth.authorizationToken);

    const { storageApi } = auth.apiInfo;

    assert(storageApi);
    assertEquals(storageApi.absoluteMinimumPartSize, 5000000);
    assertEquals(storageApi.bucketId, B2_BUCKET_ID);
    assert(storageApi.bucketName);
    assert(storageApi);
    assert(Array.isArray(storageApi.capabilities));
    assertEquals(storageApi.namePrefix, null);
    assert(storageApi.apiUrl);
    assert(storageApi.downloadUrl);
    assertEquals(storageApi.recommendedPartSize, 100000000);
    assert(storageApi.s3ApiUrl);

    await t.step('uploadFile', async () => {
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

        assert(upload.accountId);
        assertEquals(upload.action, 'upload');
        assertEquals(upload.bucketId, B2_BUCKET_ID);
        assertEquals(upload.contentLength, 24);
        assert(upload.contentMd5);
        assert(upload.contentSha1);
        assertEquals(upload.contentType, 'text/plain');
        assert(upload.fileId);
        assert(typeof upload.fileInfo === 'object');
        assert(upload.fileInfo['b2-content-disposition']);
        assert(upload.fileName);
        assertEquals(upload.fileRetention.isClientAuthorizedToRead, false);
        assertEquals(upload.fileRetention.value, null);
        assertEquals(upload.legalHold.isClientAuthorizedToRead, false);
        assertEquals(upload.legalHold.value, null);
        assertEquals(upload.serverSideEncryption.algorithm, null);
        assertEquals(upload.serverSideEncryption.mode, null);
        assert(upload.uploadTimestamp);

        const downloadUrl = b2.getDownloadUrl(upload.fileName);

        assert(downloadUrl);
    });

    await t.step('listFileNames', async () => {
        const list = await b2.listFileNames({
            bucketId: B2_BUCKET_ID,
        });

        assert(Array.isArray(list.files));
    });
});
