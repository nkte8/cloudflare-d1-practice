/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// export default {
// 	async fetch(request, env, ctx): Promise<Response> {
// 		return new Response('Hello World!');
// 	},
// } satisfies ExportedHandler<Env>;


// prisma generateで作成されたprismaClient
import { PrismaClient } from './generated/prisma/';
import { PrismaD1 } from '@prisma/adapter-d1';

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const adapter = new PrismaD1(env.DB);
    const prisma = new PrismaClient({ adapter });

	// prisma.<DB名>で操作ができる
    const pages = await prisma.page.findMany();
    const result = JSON.stringify(pages);
    return new Response(result);
  },
} satisfies ExportedHandler<Env>;