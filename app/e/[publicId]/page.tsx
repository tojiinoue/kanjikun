import type { Metadata } from "next";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { formatAreaLabel } from "@/lib/area-options";
import PublicEventClient from "./public-event-client";

type PageProps = {
  params: Promise<{ publicId: string }>;
};

function buildEventDescription(
  name: string,
  memo: string | null,
  areaPrefCode?: string | null,
  areaMunicipalityName?: string | null
) {
  const areaLabel = formatAreaLabel(areaPrefCode, areaMunicipalityName);
  const parts = [
    areaLabel ? `エリア: ${areaLabel}` : null,
    memo?.trim() ? memo.trim() : null,
  ].filter(Boolean) as string[];
  if (parts.length === 0) {
    return `${name}のイベントページです。`;
  }
  return `${name}｜${parts.join("｜")}`;
}

const getEventForMetadata = unstable_cache(
  async (publicId: string) => {
    return prisma.event.findUnique({
      where: { publicId },
      select: {
        name: true,
        memo: true,
        areaPrefCode: true,
        areaMunicipalityName: true,
      },
    });
  },
  ["event-metadata"],
  { revalidate: 300 }
);

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  const event = await getEventForMetadata(publicId);

  if (!event) {
    return {
      title: "イベントが見つかりません",
      robots: { index: false, follow: false },
    };
  }

  const description = buildEventDescription(
    event.name,
    event.memo,
    event.areaPrefCode,
    event.areaMunicipalityName
  );

  return {
    title: event.name,
    description,
    alternates: {
      canonical: `/e/${publicId}`,
    },
    openGraph: {
      title: event.name,
      description,
      url: `/e/${publicId}`,
    },
    twitter: {
      card: "summary",
      title: event.name,
      description,
    },
  };
}

export default async function EventPublicPage({ params }: PageProps) {
  const { publicId } = await params;
  return <PublicEventClient publicId={publicId} />;
}
