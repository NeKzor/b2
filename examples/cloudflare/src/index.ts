import { BackblazeClient } from '@nekz/b2';

export interface Env {
	B2_BUCKET_ID: string;
	B2_APP_KEY_ID: string;
	B2_APP_KEY: string;
	USER_AGENT: string;
	SERVER: DurableObjectNamespace;
}

export class Server {
	state: DurableObjectState;
	env: Env;
	b2: BackblazeClient | null;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;

		this.state.blockConcurrencyWhile(async () => {
			this.b2 = new BackblazeClient({
				userAgent: env.USER_AGENT,
			});

			const auth = await this.b2.authorizeAccount({
				applicationKeyId: env.B2_APP_KEY_ID,
				applicationKey: env.B2_APP_KEY,
			});
		});
	}

	async fetch(request: Request): Promise<Response> {
		const fileName = crypto.randomUUID();
		const downloadFileName = 'text.txt';
		const fileContents = new TextEncoder().encode(new Date().toISOString());

		const upload = await this.b2.uploadFile({
			bucketId: this.env.B2_BUCKET_ID,
			fileName,
			fileContents,
			contentType: 'text/plain',
			contentDisposition: `attachment; filename="${encodeURIComponent(downloadFileName)}"`,
		});

		const downloadUrl = this.b2.getDownloadUrl(upload.fileName);

		return new Response(downloadUrl);
	}
}

export default {
	async fetch(request, env) {
		return await handleRequest(request, env);
	}
}

async function handleRequest(request, env) {
	const id = env.SERVER.idFromName("A");
	const obj = env.SERVER.get(id);
	const resp = await obj.fetch(request);
	return new Response(await resp.text());
}
