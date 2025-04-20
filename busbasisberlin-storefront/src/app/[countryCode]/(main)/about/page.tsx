"use client";

import Image from "next/image";
import { Timeline } from "@modules/common/components/ui/timeline";

export default function AboutPage() {
  const timelineData = [
    {
      title: "2024",
      content: (
        <div>
          <p className="text-neutral-300 text-xs md:text-sm font-normal mb-8">
            Expanding our online presence with a state-of-the-art e-commerce platform to serve customers across Europe.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="/images/about/Werkstattarbeiten_II.jpg"
              alt="Modern workshop facility"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(0,0,0,0.3)]"
            />
            <Image
              src="/images/about/tools_IV.jpg"
              alt="Expanded inventory"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(0,0,0,0.3)]"
            />
          </div>
        </div>
      ),
    },
    {
      title: "2020",
      content: (
        <div>
          <p className="text-neutral-300 text-xs md:text-sm font-normal mb-8">
            Modernized our inventory management system and expanded our warehouse capacity to serve more customers efficiently.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="/images/about/warehouse-2020.jpg"
              alt="New warehouse facility"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(0,0,0,0.3)]"
            />
            <Image
              src="/images/about/team-2020.jpg"
              alt="Growing team"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(0,0,0,0.3)]"
            />
          </div>
        </div>
      ),
    },
    {
      title: "2015",
      content: (
        <div>
          <p className="text-neutral-300 text-xs md:text-sm font-normal mb-4">
            Key milestones in our journey:
          </p>
          <div className="mb-8">
            <div className="flex gap-2 items-center text-neutral-400 text-xs md:text-sm">
              ✓ Established our first dedicated parts warehouse
            </div>
            <div className="flex gap-2 items-center text-neutral-400 text-xs md:text-sm">
              ✓ Partnered with major European bus manufacturers
            </div>
            <div className="flex gap-2 items-center text-neutral-400 text-xs md:text-sm">
              ✓ Launched our quality assurance program
            </div>
            <div className="flex gap-2 items-center text-neutral-400 text-xs md:text-sm">
              ✓ Expanded our technical support team
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
          <Image
              src="/images/about/Werkstattarbeiten_II.jpg"
              alt="Modern workshop facility"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(0,0,0,0.3)]"
            />
            <Image
              src="/images/about/tools_IV.jpg"
              alt="Expanded inventory"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(0,0,0,0.3)]"
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen w-full">
      <div className="w-full">
        <Timeline data={timelineData} />
      </div>
    </div>
  );
}
