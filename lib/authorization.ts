import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/session";

export async function assertEventAdmin(
  eventId: string,
  ownerClientId?: string | null
) {
  const session = await getServerAuthSession();
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return { ok: false, status: 404 as const, event: null };
  }

  if (session?.user?.id && event.ownerUserId === session.user.id) {
    return { ok: true, status: 200 as const, event };
  }

  return { ok: false, status: 403 as const, event };
}
