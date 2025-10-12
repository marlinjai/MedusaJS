// src/modules/account/components/account-info/index.tsx
import { Disclosure } from '@headlessui/react';
import { Button, clx } from '@medusajs/ui';
import { useEffect } from 'react';

import useToggleState from '@lib/hooks/use-toggle-state';
import { useFormStatus } from 'react-dom';

type AccountInfoProps = {
	label: string;
	currentInfo: string | React.ReactNode;
	isSuccess?: boolean;
	isError?: boolean;
	errorMessage?: string;
	clearState: () => void;
	children?: React.ReactNode;
	'data-testid'?: string;
};

const AccountInfo = ({
	label,
	currentInfo,
	isSuccess,
	isError,
	clearState,
	errorMessage = 'Ein Fehler ist aufgetreten, bitte versuchen Sie es erneut',
	children,
	'data-testid': dataTestid,
}: AccountInfoProps) => {
	const { state, close, toggle } = useToggleState();

	const { pending } = useFormStatus();

	const handleToggle = () => {
		clearState();
		setTimeout(() => toggle(), 100);
	};

	useEffect(() => {
		if (isSuccess) {
			close();
		}
	}, [isSuccess, close]);

	return (
		<div
			className="bg-neutral-800 rounded-xl p-6 border border-neutral-700"
			data-testid={dataTestid}
		>
			<div className="flex items-start justify-between mb-4">
				<div className="flex-1">
					<h3 className="text-lg font-semibold text-white mb-2">{label}</h3>
					<div className="flex items-center">
						{typeof currentInfo === 'string' ? (
							<span className="text-neutral-300" data-testid="current-info">
								{currentInfo}
							</span>
						) : (
							currentInfo
						)}
					</div>
				</div>
				<div className="ml-4">
					<Button
						variant="secondary"
						className={clx(
							'px-4 py-2 min-w-[100px] transition-colors',
							state
								? 'bg-neutral-700 hover:bg-neutral-600 text-white border-neutral-600'
								: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
						)}
						onClick={handleToggle}
						type={state ? 'reset' : 'button'}
						data-testid="edit-button"
						data-active={state}
					>
						{state ? 'Abbrechen' : 'Bearbeiten'}
					</Button>
				</div>
			</div>

			{/* Success state */}
			<Disclosure>
				<Disclosure.Panel
					static
					className={clx(
						'transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden',
						{
							'max-h-[1000px] opacity-100': isSuccess,
							'max-h-0 opacity-0': !isSuccess,
						},
					)}
					data-testid="success-message"
				>
					<div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
						<div className="flex items-center gap-2">
							<svg
								className="w-5 h-5 text-green-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<span className="text-green-400 font-medium">
								{label} erfolgreich aktualisiert
							</span>
						</div>
					</div>
				</Disclosure.Panel>
			</Disclosure>

			{/* Error state  */}
			<Disclosure>
				<Disclosure.Panel
					static
					className={clx(
						'transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden',
						{
							'max-h-[1000px] opacity-100': isError,
							'max-h-0 opacity-0': !isError,
						},
					)}
					data-testid="error-message"
				>
					<div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
						<div className="flex items-center gap-2">
							<svg
								className="w-5 h-5 text-red-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
							<span className="text-red-400 font-medium">{errorMessage}</span>
						</div>
					</div>
				</Disclosure.Panel>
			</Disclosure>

			{/* Edit Form */}
			<Disclosure>
				<Disclosure.Panel
					static
					className={clx(
						'transition-[max-height,opacity] duration-300 ease-in-out overflow-visible',
						{
							'max-h-[1000px] opacity-100': state,
							'max-h-0 opacity-0': !state,
						},
					)}
				>
					<div className="mt-6 pt-6 border-t border-neutral-700">
						<div className="space-y-4">
							{children}
							<div className="flex items-center justify-end pt-4">
								<Button
									isLoading={pending}
									className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 min-w-[140px]"
									type="submit"
									data-testid="save-button"
								>
									{pending ? 'Speichern...' : 'Änderungen speichern'}
								</Button>
							</div>
						</div>
					</div>
				</Disclosure.Panel>
			</Disclosure>
		</div>
	);
};

export default AccountInfo;
