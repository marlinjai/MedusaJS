import { Metadata } from 'next';

import { getRegion } from '@lib/data/regions';
import FAQSection from '@modules/contact/components/faq-section';
import ContactSection from '@modules/contact/templates/contact-section';
import Hero from '@modules/home/components/hero';
import ImageSection from '@modules/home/components/image-section';
import Services from '@modules/home/components/services';
import StorePrefetch from '@modules/home/components/store-prefetch';
import Team from '@modules/home/components/team';
import Verein from '@modules/home/components/verein';
import AnnouncementBanner from '@modules/home/components/announcement-banner';

export const metadata: Metadata = {
	title: 'BusBasis Berlin - Ihr Spezialist für Mercedes-Transporter',
	description:
		'Professionelle Wartung, Reparatur und Umbau von Mercedes-Transportern. Spezialisiert auf Wohnmobile und Expeditionsfahrzeuge.',
};

export default async function Home(props: {
	params: Promise<{ countryCode: string }>;
}) {
	const params = await props.params;

	const { countryCode } = params;

	const region = await getRegion(countryCode);

	if (!region) {
		return <div>No region found</div>;
	}

	return (
		<div className="scroll-smooth">
			<StorePrefetch />
			<Hero />
			<AnnouncementBanner />
			<Services />
			<ImageSection />
			<Team />
			<Verein />
			<ContactSection />
			<FAQSection />
		</div>
	);
}
