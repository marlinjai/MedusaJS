import { Metadata } from 'next';

import { getRegion } from '@lib/data/regions';
import Hero from '@modules/home/components/hero';
import ImageSection from '@modules/home/components/image-section';
import Services from '@modules/home/components/services';
import Team from '@modules/home/components/team';
import Verein from '@modules/home/components/verein';

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
		<>
			<Hero />
			<Services />
			<ImageSection />
			<Team />
			<Verein />
		</>
	);
}
