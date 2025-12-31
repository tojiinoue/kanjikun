import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/session";
import NewEventClient from "./new-event-client";

export default async function NewEventPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <NewEventClient />;
}
