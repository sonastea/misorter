import { expect, mock, test } from "bun:test";
import type { CookieToSet } from "../../src/utils/cookie-headers";

process.env.SUPABASE_URL = "https://auth.example.test";
process.env.SUPABASE_ANON_KEY = "test-key";
const clients: string[] = [];
mock.module("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookies: {
        getAll: () => { name: string; value: string }[];
        setAll: (cookies: CookieToSet[]) => void;
      };
    }
  ) => {
    const id = options.cookies
      .getAll()
      .find((cookie) => cookie.name === "session")?.value;
    clients.push(id ?? "");
    return {
      auth: {
        getUser: async () => {
          await Promise.resolve();
          if (id === "fault") throw new Error("Auth transport failed");
          options.cookies.setAll([
            {
              name: "session",
              value: `${id}-refreshed`,
              options: { httpOnly: true, path: "/" },
            },
            { name: "rotation", value: id ?? "", options: { secure: true } },
          ]);
          return {
            data: { user: id && id !== "invalid" ? { id } : null },
            error: id === "invalid" ? new Error("Invalid session") : null,
          };
        },
      },
    };
  },
}));
const { authRouter } = await import("../../src/backend/router/auth");
const { router, protectedProcedure } = await import("../../src/backend/trpc");
const protectedRouter = router({
  who: protectedProcedure.query(({ ctx }) => ctx.user.id),
});
const context = (cookie = "") => ({
  req: new Request("https://app.example.test/trpc", { headers: { cookie } }),
  resHeaders: new Headers({ "x-request": cookie }),
  waitUntil: () => {},
});

test("missing and invalid sessions stay unauthenticated in public and protected procedures", async () => {
  const count = clients.length;
  expect(await authRouter.createCaller(context()).getCurrentUser()).toBeNull();
  expect(clients.length).toBe(count);
  for (const cookie of ["", "session=invalid", "unrelated=value"]) {
    expect(
      await authRouter.createCaller(context(cookie)).getCurrentUser()
    ).toBeNull();
    await expect(
      protectedRouter.createCaller(context(cookie)).who()
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  }
});

test("concurrent verified sessions refresh only their own response cookies", async () => {
  const alice = context("session=alice");
  const bob = context("session=bob");
  const [user, id] = await Promise.all([
    authRouter.createCaller(alice).getCurrentUser(),
    protectedRouter.createCaller(bob).who(),
  ]);
  expect(user?.id).toBe("alice");
  expect(id).toBe("bob");
  for (const [ctx, name] of [
    [alice, "alice"],
    [bob, "bob"],
  ] as const) {
    expect(ctx.resHeaders.get("x-request")).toBe(`session=${name}`);
    expect(ctx.resHeaders.getSetCookie()).toEqual([
      `session=${name}-refreshed; Path=/; HttpOnly`,
      `rotation=${name}; Path=/; Secure`,
    ]);
  }
});

test("unexpected authentication faults propagate", async () => {
  await expect(
    authRouter.createCaller(context("session=fault")).getCurrentUser()
  ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
});
