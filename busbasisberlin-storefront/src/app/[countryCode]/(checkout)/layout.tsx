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
			<main className="relative pt-24 min-h-screen">
				{children}
			</main>
			<Footer />
		</>
	);
}
