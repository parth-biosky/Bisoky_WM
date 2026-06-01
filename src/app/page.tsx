import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-gray-900 mb-3">Welcome</h1>
        <p className="text-gray-500 mb-8 text-sm">Sign in or create an account to continue.</p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg px-5 py-2 text-sm font-medium transition-colors"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
