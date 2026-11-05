import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleVercel } from '../server/vercel';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await handleVercel(req, res);
}
