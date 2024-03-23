// Copyright (c) 2024, NeKz
// SPDX-License-Identifier: MIT

/** Allowed capabilities of an authorized account.  */
export type AllowedCapability =
    | 'shareFiles'
    | 'writeBucketReplications'
    | 'deleteFiles'
    | 'readBuckets'
    | 'writeFiles'
    | 'readBucketReplications'
    | 'listBuckets'
    | 'readFiles'
    | 'listFiles'
    | 'writeBucketEncryption'
    | 'readBucketEncryption';

/**
 * Response object of a file upload.
 *
 * @see BackblazeClient.uploadFile
 */
export interface AuthorizeAccountResponse {
    accountId: string;
    apiInfo: {
        storageApi: {
            absoluteMinimumPartSize: number;
            apiUrl: string;
            bucketId: string;
            bucketName: string;
            capabilities: AllowedCapability[];
            downloadUrl: string;
            infoType: string;
            namePrefix: string | null;
            recommendedPartSize: number;
            s3ApiUrl: string;
        };
    };
    applicationKeyExpirationTimestamp: number | null;
    authorizationToken: string;
}

/**
 * Response object of a file upload.
 *
 * @see BackblazeClient.uploadFile
 */
export interface UploadFileResponse {
    accountId: string;
    action: string;
    bucketId: string;
    contentLength: number;
    contentMd5: string;
    contentSha1: string;
    contentType: string;
    fileId: string;
    fileInfo: {
        hash_sha1?: string;
        src_last_modified_millis?: string;
        'b2-content-disposition'?: string;
    };
    fileName: string;
    fileRetention: { isClientAuthorizedToRead: false; value: null };
    legalHold: { isClientAuthorizedToRead: false; value: null };
    serverSideEncryption: { algorithm: null; mode: null };
    uploadTimestamp: number;
}

/**
 * Upload URL response object.
 *
 * @see BackblazeClient.getUploadUrl
 */
export interface GetUploadUrlResponse {
    authorizationToken: string;
    bucketId: string;
    uploadUrl: string;
}

/** Valid Backblaze API operations. */
export type BackblazeApiOperation =
    | 'b2_authorize_account'
    | 'b2_cancel_large_file'
    | 'b2_copy_file'
    | 'b2_copy_part'
    | 'b2_create_bucket'
    | 'b2_create_key'
    | 'b2_delete_bucket'
    | 'b2_delete_file_version'
    | 'b2_delete_key'
    | 'b2_download_file_by_id'
    | 'b2_download_file_by_name'
    | 'b2_finish_large_file'
    | 'b2_get_download_authorization'
    | 'b2_get_file_info'
    | 'b2_get_upload_part_url'
    | 'b2_get_upload_url'
    | 'b2_hide_file'
    | 'b2_list_buckets'
    | 'b2_list_file_names'
    | 'b2_list_file_versions'
    | 'b2_list_keys'
    | 'b2_list_parts'
    | 'b2_list_unfinished_large_files'
    | 'b2_start_large_file'
    | 'b2_update_bucket'
    | 'b2_update_file_legal_hold'
    | 'b2_update_file_retention'
    | 'b2_upload_file'
    | 'b2_upload_part';

export interface BackblazeApiError {
    status: number;
    code: string;
    message: string;
}

/**
 * Required credentials for authorization.
 *
 * @see BackblazeClient.authorizeAccount
 */
export interface BackblazeAccount {
    /** Application Key ID (also known as Account ID)  */
    applicationKeyId: string;
    /** Application Key */
    applicationKey: string;
}

/**
 * Options for getting an upload URL.
 */
export interface UploadUrlOptions {
    /** ID of bucket. */
    bucketId: string;
}

/**
 * Options for uploading a file.
 */
export interface UploadFileOptions {
    /** ID of bucket. */
    bucketId: string;
    /** Name of file. */
    fileName: string;
    /** Contents of file. */
    fileContents: BufferSource;
    /** SHA-1 hash of file. Defaults to the client's `hasher` function which can be overwritten in construction. */
    fileHash?: string;
    /** Content-Type header value. Defaults to 'b2/x-auto'. */
    contentType?: string;
    /** Response object when calling `getUploadUrl()`. */
    uploadUrl?: GetUploadUrlResponse;
    /** Sets the 'X-Bz-Info-b2-content-disposition' header value. */
    contentDisposition?: string;
}

/** SHA-1 hash function. */
export type Sha1HashFunction = (
    buffer: BufferSource,
) => string | Promise<string>;

/**
 * Options for constructing new Backblaze client.
 *
 * @see BackblazeClient
 */
export interface BackblazeClientOptions {
    /** Required User-Agent e.g. 'My-App-v1' */
    userAgent: string;
    /** Base API. Defaults to 'https://api.backblazeb2.com'. */
    baseApi?: string;
    /** Custom SHA-1 hash function. Used to generate the required SHA-1 checksum for every file upload. */
    hasher?: Sha1HashFunction;
    /**
     * Automatically call authorizeAccount() on 401 response status.
     * A call to authorizeAccount() itself will not cause a retry.
     * This is on by default.
     */
    automaticRetryOnUnauthorizedStatus?: boolean;
}

type ApiOperationOptions = ({ baseApi: string } | { url: string }) & {
    headers: HeadersInit;
    body?: BodyInit | null;
};

/**
 * API client for Backblaze.
 *
 * @see https://www.backblaze.com/b2/docs/calling.html
 */
export class BackblazeClient {
    readonly #userAgent: string;
    readonly #hasher: Sha1HashFunction;
    readonly #automaticRetryOnUnauthorizedStatus: boolean;

    /** Authorization object. Will be set by calling `authorizeAccount()`. */
    authorization: AuthorizeAccountResponse | null;

    #accountCredentials?: string;

    /**
     * Constructs a new Backblaze client.
     *
     * @param options - Client options. Setting `userAgent` is required.
     */
    constructor(options: BackblazeClientOptions) {
        this.#userAgent = options.userAgent;
        this.#hasher = options.hasher ??
            (async (buffer: BufferSource) => {
                const hash = await crypto.subtle.digest('SHA-1', buffer);
                return Array.from(new Uint8Array(hash))
                    .map((b) => b.toString(16).padStart(2, '0'))
                    .join('');
            });
        this.#automaticRetryOnUnauthorizedStatus = options.automaticRetryOnUnauthorizedStatus ?? true;
        this.authorization = null;
    }

    protected checkAuthorization(): void {
        if (!this.authorization) {
            throw new Error(
                'Client is not authorized. Did you forget to call authorizeAccount()?',
            );
        }
    }

    protected async generateHash(buffer: BufferSource): Promise<string> {
        if ('then' in this.#hasher) {
            return await this.#hasher(buffer);
        } else {
            return this.#hasher(buffer);
        }
    }

    protected async call<TResponse>(
        operation: BackblazeApiOperation,
        options: ApiOperationOptions,
    ): Promise<TResponse> {
        const headers = new Headers({
            ...options.headers,
            'User-Agent': this.#userAgent,
        });

        if (!headers.get('Content-Type')) {
            headers.append('Content-Type', 'application/json');
        }

        const uri = 'url' in options ? options.url : `${options.baseApi}/b2api/v3/${operation}`;

        const fetchResponse = async () => {
            return await fetch(uri, {
                method: options.body ? 'POST' : 'GET',
                headers,
                body: options.body,
            });
        };

        let res = await fetchResponse();

        if (!res.ok) {
            const throwError = async () => {
                const text = await res.text();
                throw new Error(`Call to ${uri} failed: ${res.status}\n${text}`);
            };

            if (
                res.status === 401 &&
                this.#automaticRetryOnUnauthorizedStatus &&
                operation !== 'b2_authorize_account'
            ) {
                await this.internalAuthorizeAccount();

                headers.set('Authorization', this.authorization!.authorizationToken);

                res = await fetchResponse();

                if (!res.ok) {
                    await throwError();
                }
            } else {
                await throwError();
            }
        }

        return await res.json();
    }

    /**
     * Get authorization for a given account.
     *
     * @param account - Account credentials
     * @returns - Authorization object. This object will be set for this client for further API calls.
     * @see https://www.backblaze.com/b2/docs/b2_authorize_account.html
     */
    public async authorizeAccount(
        account: BackblazeAccount,
    ): Promise<AuthorizeAccountResponse> {
        this.#accountCredentials = btoa(
            `${account.applicationKeyId}:${account.applicationKey}`,
        );

        await this.internalAuthorizeAccount();

        return this.authorization!;
    }

    protected async internalAuthorizeAccount() {
        this.authorization = await this.call<AuthorizeAccountResponse>(
            'b2_authorize_account',
            {
                baseApi: 'https://api.backblazeb2.com',
                headers: {
                    Authorization: `Basic ${this.#accountCredentials}`,
                },
            },
        );
    }

    /**
     * Gets a new URL for uploading a file.
     *
     * NOTE: Requires authorization.
     *
     * @param options
     * @returns Response object of upload URL.
     */
    public async getUploadUrl(options: UploadUrlOptions): Promise<GetUploadUrlResponse> {
        this.checkAuthorization();

        type GetUploadUrlRequestBody = {
            bucketId: string;
        };

        return await this.call<GetUploadUrlResponse>('b2_get_upload_url', {
            baseApi: this.authorization!.apiInfo.storageApi.apiUrl,
            headers: {
                Authorization: this.authorization!.authorizationToken,
            },
            body: JSON.stringify(
                {
                    bucketId: options.bucketId,
                } satisfies GetUploadUrlRequestBody,
            ),
        });
    }

    /**
     * Uploads a file to a bucket.
     * This will automatically handle the upload URL request
     * if the `uploadUrl` option is not provided.
     *
     * NOTE: Requires authorization.
     *
     * @param options - File upload options.
     * @returns Response object of uploaded file.
     * @see https://www.backblaze.com/b2/docs/b2_upload_file.html
     */
    public async uploadFile(options: UploadFileOptions): Promise<UploadFileResponse> {
        const { authorizationToken, uploadUrl } = options.uploadUrl ?? await this.getUploadUrl({
            bucketId: options.bucketId,
        });

        const hash = options.fileHash ??
            (await this.generateHash(options.fileContents));

        if (hash.length !== 40) {
            throw new Error(
                `Invalid file hash length. The generate SHA-1 hash should be 40 bytes long.`,
            );
        }

        return await this.call<UploadFileResponse>('b2_upload_file', {
            url: uploadUrl,
            headers: {
                Authorization: authorizationToken,
                'X-Bz-File-Name': options.fileName
                    .split('/')
                    .map((part) => encodeURIComponent(part))
                    .join('/'),
                'Content-Type': options.contentType ?? 'b2/x-auto',
                'Content-Length': options.fileContents.byteLength.toString(),
                'X-Bz-Content-Sha1': hash,
                ...(options.contentDisposition
                    ? { 'X-Bz-Info-b2-content-disposition': encodeURIComponent(options.contentDisposition) }
                    : {}),
            },
            body: options.fileContents,
        });
    }

    /**
     * Util which constructs the download URL for an uploaded file.
     * This method does not make any API call.
     *
     * NOTE: Requires authorization.
     *
     * @param fileName - Name of file.
     * @returns Constructed download URL.
     */
    public getDownloadUrl(fileName: string): string {
        this.checkAuthorization();

        const { downloadUrl, bucketName } = this.authorization!.apiInfo.storageApi;
        return new URL(`/file/${bucketName}/${fileName}`, downloadUrl).toString();
    }
}
