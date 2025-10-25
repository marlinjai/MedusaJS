'use client';

import { ArrowUpRightMini } from '@medusajs/icons';
import Link from 'next/link';

export default function NotFound() {
	return (
		<div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)] bg-gray-900">
			<h1 className="text-2xl font-bold text-white">Page not found</h1>
			<p className="text-sm text-gray-400">
				The page you tried to access does not exist.
			</p>
			<Link
				className="flex gap-x-1 items-center group mt-4 text-blue-400 hover:text-blue-300 transition-colors"
				href="/"
			>
				<span>Go to frontpage</span>
				<ArrowUpRightMini
					className="group-hover:rotate-45 ease-in-out duration-150"
					color="#60a5fa"
				/>
			</Link>
		</div>
	);
}
