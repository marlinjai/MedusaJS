import { getBaseURL } from '@lib/util/env';
import { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { StoreSettingsProvider } from '@lib/context/store-settings-context';
import '../styles/globals.css';

// Import German translations directly
import messages from '../../messages/de.json';

export const metadata: Metadata = {
	metadataBase: new URL(getBaseURL()),
};

export default function RootLayout(props: { children: React.ReactNode }) {
	return (
		<html lang="de" data-mode="dark" className="dark overflow-x-hidden">
			<body className="overflow-x-hidden">
				<NextIntlClientProvider locale="de" messages={messages}>
					<StoreSettingsProvider>
						<main className="relative overflow-x-hidden">{props.children}</main>
					</StoreSettingsProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
