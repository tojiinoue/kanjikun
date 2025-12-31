import PublicEventClient from "./public-event-client";

type PageProps = {
  params: Promise<{ publicId: string }>;
};

export default async function EventPublicPage({ params }: PageProps) {
  const { publicId } = await params;
  return <PublicEventClient publicId={publicId} />;
}
