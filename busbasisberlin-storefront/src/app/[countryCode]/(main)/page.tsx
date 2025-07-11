import { Metadata } from "next"

import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import Services from "@modules/home/components/services"
import Team from "@modules/home/components/team"

export const metadata: Metadata = {
  title: "BusBasis Berlin - Ihr Spezialist für Mercedes-Transporter",
  description:
    "Professionelle Wartung, Reparatur und Umbau von Mercedes-Transportern. Spezialisiert auf Wohnmobile und Expeditionsfahrzeuge.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  // Simplified collections query for debugging
  const { collections } = await listCollections()
  console.log("Collections count:", collections?.length || 0)
  console.log("Collections data:", collections)
  console.log("Region:", region)

  if (!region) {
    return <div>No region found</div>
  }

  return (
    <>
      <Hero />
      <Services />
      <Team />
      <div className="py-12">
        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections || []} region={region} />
        </ul>
      </div>
    </>
  )
}
