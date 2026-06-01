import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OrbixAppWrapper from "./orbix-wrapper";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <OrbixAppWrapper
      supabaseUser={{ id: user.id, email: user.email ?? "" }}
    />
  );
}
