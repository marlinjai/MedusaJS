// src/app/error.tsx
// Global error boundary - handles runtime errors
'use client';

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)] bg-gray-900 px-4">
			<h1 className="text-2xl font-bold text-white">
				Etwas ist schiefgelaufen
			</h1>
			<p className="text-sm text-gray-400 text-center max-w-md">
				Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
			</p>
			{error.message && (
				<p className="text-xs text-gray-500 bg-gray-800 px-4 py-2 rounded border border-gray-700 max-w-md overflow-auto">
					{error.message}
				</p>
			)}
			<button
				onClick={reset}
				className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
			>
				Erneut versuchen
			</button>
		</div>
	);
}