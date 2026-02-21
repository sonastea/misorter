import { createBrowserClient } from "@supabase/ssr";
import { Button, Field, Fieldset, Input, Label } from "@headlessui/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SubmitEvent, useEffect, useMemo, useState } from "react";

type LoginSearch = {
  redirect?: string;
};

function getRequiredEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required to use Supabase auth.`);
  }

  return value;
}

const supabase = createBrowserClient(
  getRequiredEnv(import.meta.env.VITE_SUPABASE_URL, "VITE_SUPABASE_URL"),
  getRequiredEnv(import.meta.env.VITE_SUPABASE_KEY, "VITE_SUPABASE_KEY")
);

function getSafeRedirect(path: string | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/admin/dashboard";
  }

  return path;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const redirectTo = useMemo(() => getSafeRedirect(redirect), [redirect]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (!isMounted || error || !user) {
        return;
      }

      navigate({ to: redirectTo, replace: true });
    });

    return () => {
      isMounted = false;
    };
  }, [navigate, redirectTo]);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(
        "You are signed in, but we could not confirm your account."
      );
      setIsSubmitting(false);
      return;
    }

    await navigate({ to: redirectTo, replace: true });
  };

  return (
    <main className="adminAuth-shell">
      <section className="adminAuth-card">
        <h1 className="adminAuth-title">Admin Login</h1>
        <p className="adminAuth-subtitle">Sign in to access your dashboard.</p>

        <form className="adminAuth-form" onSubmit={handleSubmit}>
          <Fieldset className="adminAuth-fieldset" disabled={isSubmitting}>
            <Field className="adminAuth-field">
              <Label className="adminAuth-label">Email</Label>
              <Input
                type="email"
                className="adminAuth-input"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                required
                autoComplete="email"
              />
            </Field>

            <Field className="adminAuth-field">
              <Label className="adminAuth-label">Password</Label>
              <Input
                type="password"
                className="adminAuth-input"
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                required
                autoComplete="current-password"
              />
            </Field>
          </Fieldset>

          {errorMessage ? (
            <p role="alert" className="adminAuth-error">
              {errorMessage}
            </p>
          ) : null}

          <Button
            type="submit"
            className="adminAuth-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}
