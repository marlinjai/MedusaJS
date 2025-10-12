// src/modules/account/templates/login-template.tsx
'use client';

import { useState } from 'react';

import Login from '@modules/account/components/login';
import Register from '@modules/account/components/register';

export enum LOGIN_VIEW {
	SIGN_IN = 'sign-in',
	REGISTER = 'register',
}

const LoginTemplate = () => {
	const [currentView, setCurrentView] = useState<LOGIN_VIEW>(
		LOGIN_VIEW.SIGN_IN,
	);

	return (
		<div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4 py-8 relative">
			{/* Background Texture */}
			<div
				className="absolute inset-0 opacity-10 bg-cover bg-center bg-no-repeat"
				style={{
					backgroundImage: 'url(/images/texture_I.jpg)',
				}}
			/>

			{/* Content Overlay */}
			<div className="relative z-10 w-full max-w-md">
				<div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 shadow-2xl">
					{currentView === 'sign-in' ? (
						<Login setCurrentView={setCurrentView} />
					) : (
						<Register setCurrentView={setCurrentView} />
					)}
				</div>
			</div>
		</div>
	);
};

export default LoginTemplate;
