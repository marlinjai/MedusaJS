// src/app/500.tsx
// Custom 500 error page for Next.js 16

export default function Custom500() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center">
			<h1 className="text-4xl font-bold">500 - Server Error</h1>
			<p className="mt-4 text-lg text-gray-600">
				Something went wrong on our end. Please try again later.
			</p>
		</div>
	);
}
