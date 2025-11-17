import { PAGE_PADDING_TOP } from '@lib/util/page-padding';
import Nav from '@modules/layout/templates/nav';
import Footer from '@modules/layout/templates/footer';

export default function CheckoutLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<Nav />
			<main className={`relative min-h-screen ${PAGE_PADDING_TOP}`}>
				{children}
			</main>
			<Footer />
		</>
	);
}
