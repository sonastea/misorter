import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { Button } from "@headlessui/react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

function getRequiredEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required to use Supabase auth.`);
  }

  return value;
}

const supabaseUrl = getRequiredEnv(
  import.meta.env.VITE_SUPABASE_URL,
  "VITE_SUPABASE_URL"
);
const supabaseAnonKey = getRequiredEnv(
  import.meta.env.VITE_SUPABASE_KEY,
  "VITE_SUPABASE_KEY"
);

type CookieToSet = {
  name: string;
  value: string;
  options?: {
    path?: string;
    maxAge?: number;
    domain?: string;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none" | boolean;
  };
};

function parseCookies(
  cookieHeader: string
): Array<{ name: string; value: string }> {
  if (!cookieHeader) return [];

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie) => {
      const separatorIndex = cookie.indexOf("=");
      if (separatorIndex < 0) {
        return { name: cookie, value: "" };
      }

      const name = decodeURIComponent(cookie.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(cookie.slice(separatorIndex + 1).trim());

      return { name, value };
    });
}

function redirectToLogin(redirectPath: string) {
  throw redirect({
    to: "/login",
    search: {
      redirect: redirectPath,
    },
  });
}

export const Route = createFileRoute("/_authenticated/_admin/admin/dashboard")({
  ssr: true,
  beforeLoad: async ({ location }) => {
    const cookieHeader = typeof document === "undefined" ? "" : document.cookie;

    if (typeof document === "undefined") {
      return;
    }

    if (!cookieHeader) {
      redirectToLogin(location.pathname);
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => parseCookies(cookieHeader),
        setAll: (cookiesToSet: CookieToSet[]) => {
          if (typeof document === "undefined") return;

          for (const { name, value, options } of cookiesToSet) {
            const path = options?.path ?? "/";
            let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}`;

            if (options?.maxAge !== undefined) {
              cookie += `; max-age=${options.maxAge}`;
            }
            if (options?.domain) {
              cookie += `; domain=${options.domain}`;
            }
            if (options?.secure) {
              cookie += "; secure";
            }
            const sameSite =
              typeof options?.sameSite === "boolean"
                ? options.sameSite
                  ? "strict"
                  : undefined
                : options?.sameSite;

            if (sameSite) {
              cookie += `; samesite=${sameSite}`;
            }

            document.cookie = cookie;
          }
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      redirectToLogin(location.pathname);
    }
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

    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
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
