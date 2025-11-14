import { Dialog, Transition } from '@headlessui/react';
import { clx } from '@medusajs/ui';
import React, { Fragment } from 'react';

import { ModalProvider, useModal } from '@lib/context/modal-context';
import X from '@modules/common/icons/x';

type ModalProps = {
	isOpen: boolean;
	close: () => void;
	size?: 'small' | 'medium' | 'large';
	search?: boolean;
	children: React.ReactNode;
	'data-testid'?: string;
};

const Modal = ({
	isOpen,
	close,
	size = 'medium',
	search = false,
	children,
	'data-testid': dataTestId,
}: ModalProps) => {
	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog as="div" className="relative z-[75]" onClose={close}>
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-opacity-75 backdrop-blur-md  h-screen" />
				</Transition.Child>

				<div className="fixed inset-0 overflow-y-auto">
					<div
						className={clx(
							'flex min-h-full h-full justify-center items-center p-4 text-center',
							{
								'overflow-hidden': search,
							},
						)}
					>
						<Transition.Child
							as={Fragment}
							enter="ease-out duration-300"
							enterFrom="opacity-0 scale-95"
							enterTo="opacity-100 scale-100"
							leave="ease-in duration-200"
							leaveFrom="opacity-100 scale-100"
							leaveTo="opacity-0 scale-95"
						>
							<Dialog.Panel
								data-testid={dataTestId}
								className={clx(
									'flex flex-col justify-start transform text-left align-middle transition-all',
									{
										'w-full': !search,
										'w-auto': search,
										'max-w-md': size === 'small' && !search,
										'max-w-xl': size === 'medium' && !search,
										'max-w-3xl': size === 'large' && !search,
										'bg-transparent shadow-none p-0': search,
										'bg-card shadow-xl border rounded-rounded p-5': !search,
										'max-h-[85vh] h-[85vh]': search,
										'max-h-[75vh] h-fit': !search,
									},
								)}
							>
								<ModalProvider close={close}>{children}</ModalProvider>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition>
	);
};

const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { close } = useModal();

	return (
		<Dialog.Title className="flex items-center justify-between">
			<div className="text-large-semi">{children}</div>
			<div>
				<button onClick={close} data-testid="close-modal-button">
					<X size={20} />
				</button>
			</div>
		</Dialog.Title>
	);
};

const Description: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return (
		<Dialog.Description className="flex text-small-regular text-ui-fg-base items-center justify-center pt-2 pb-4 h-full">
			{children}
		</Dialog.Description>
	);
};

const Body: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return <div className="flex justify-center">{children}</div>;
};

const Footer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return (
		<div className="flex items-center justify-end gap-x-4">{children}</div>
	);
};

Modal.Title = Title;
Modal.Description = Description;
Modal.Body = Body;
Modal.Footer = Footer;

export default Modal;
