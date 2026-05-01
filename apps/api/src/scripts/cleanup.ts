import { runCleanup } from '../modules/workers.module.js';

const result = await runCleanup();
console.log(JSON.stringify(result, null, 2));
