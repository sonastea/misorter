import { useState } from "react";
import { Button } from "@headlessui/react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { getSupabaseBrowserClient } from "@/utils/supabase/browser";

function redirectToLogin(redirectPath: string): never {
  throw redirect({
    to: "/login",
    search: {
      redirect: redirectPath,
    },
  });
}

export const Route = createFileRoute("/_authenticated/_admin/admin/dashboard")({
  ssr: true,
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient
      .fetchQuery(trpc.auth.getCurrentUser.queryOptions())
      .catch((err) => console.error("Admin dashboard getCurrentUser: ", err));

    if (!user) {
      redirectToLogin(location.pathname);
    }

    return { user };
  },
  loader: ({ context: { user } }) => {
    return user;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setErrorMessage(null);
    setIsSigningOut(true);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message);
      setIsSigningOut(false);
      return;
    }

    await navigate({ to: "/login", replace: true });
  };

  return (
    <main className="adminDashboard-shell">
      <section className="adminDashboard-card">
        <h1 className="adminDashboard-title">Admin Dashboard</h1>
        <p className="adminDashboard-subtitle">
          You are authenticated and can manage admin-only actions here.
        </p>

        {errorMessage ? (
          <p role="alert" className="adminDashboard-error">
            {errorMessage}
          </p>
        ) : null}

        <Button
          type="button"
          className="adminDashboard-signOut"
          disabled={isSigningOut}
          onClick={handleSignOut}
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </Button>
      </section>
    </main>
  );
}
