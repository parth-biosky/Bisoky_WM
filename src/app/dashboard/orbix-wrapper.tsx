"use client";

import OrbixApp from "@/components/orbix-app";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Props {
  supabaseUser: { id: string; email: string };
}

export default function OrbixAppWrapper({ supabaseUser }: Props) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return <OrbixApp supabaseUser={supabaseUser} onSignOut={handleSignOut} />;
}
