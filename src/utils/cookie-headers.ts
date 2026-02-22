export type CookieSameSite = "strict" | "lax" | "none" | boolean;

export type CookieToSet = {
  name: string;
  value: string;
  options?: {
    path?: string;
    maxAge?: number;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    expires?: Date;
    sameSite?: CookieSameSite;
  };
};

export function parseCookieHeader(
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
        return { name: decodeURIComponent(cookie), value: "" };
      }

      const name = decodeURIComponent(cookie.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(cookie.slice(separatorIndex + 1).trim());

      return { name, value };
    });
}

export function serializeSetCookie({
  name,
  value,
  options,
}: CookieToSet): string {
  const path = options?.path ?? "/";
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Path=${path}`,
  ];

  if (options?.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options?.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  if (options?.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  if (options?.secure) {
    parts.push("Secure");
  }

  if (options?.httpOnly) {
    parts.push("HttpOnly");
  }

  const sameSite =
    typeof options?.sameSite === "boolean"
      ? options.sameSite
        ? "Strict"
        : undefined
      : options?.sameSite
        ? options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)
        : undefined;

  if (sameSite) {
    parts.push(`SameSite=${sameSite}`);
  }

  return parts.join("; ");
}
