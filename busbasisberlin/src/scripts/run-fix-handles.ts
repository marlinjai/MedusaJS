// src/scripts/run-fix-handles.ts
// Runner script to execute handle fix

import { ExecArgs } from '@medusajs/framework/types';
import fixProductHandles from './fix-product-handles';

export default async function run({ container }: ExecArgs) {
	await fixProductHandles({ container });
}

