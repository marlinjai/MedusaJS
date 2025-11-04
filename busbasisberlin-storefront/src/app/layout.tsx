import { getBaseURL } from '@lib/util/env';
import { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import 'styles/globals.css';

// Import German translations directly
import messages from '../../messages/de.json';

export const metadata: Metadata = {
	metadataBase: new URL(getBaseURL()),
};

export default function RootLayout(props: { children: React.ReactNode }) {
	return (
		<html lang="de" data-mode="dark" className="dark">
			<body>
				<NextIntlClientProvider locale="de" messages={messages}>
					<main className="relative">{props.children}</main>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
