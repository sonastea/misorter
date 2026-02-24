/**
 * Cookie utility functions for client-side cookie management
 */

import { parseCookieHeader, serializeSetCookie } from "@/utils/cookie-headers";

export interface CookieOptions {
  expires?: Date | number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none" | boolean;
  maxAge?: number;
}

/**
 * Set a cookie
 */
export function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  const expires =
    typeof options.expires === "number"
      ? new Date(Date.now() + options.expires * 864e5)
      : options.expires;

  document.cookie = serializeSetCookie({
    name,
    value,
    options: {
      path: options.path,
      maxAge: options.maxAge,
      domain: options.domain,
      secure: options.secure,
      sameSite: options.sameSite,
      expires,
    },
  });
}

/**
 * Get a cookie value
 */
export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;

  const matchingCookie = parseCookieHeader(document.cookie).find(
    (cookie) => cookie.name === name
  );

  return matchingCookie?.value;
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string, options: CookieOptions = {}): void {
  setCookie(name, "", {
    ...options,
    expires: new Date(0),
  });
}

/**
 * Check if a cookie exists
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== undefined;
}

/**
 * Get all cookies as an object
 */
export function getAllCookies(): Record<string, string> {
  if (typeof document === "undefined") return {};

  return parseCookieHeader(document.cookie).reduce<Record<string, string>>(
    (cookies, cookie) => {
      cookies[cookie.name] = cookie.value;
      return cookies;
    },
    {}
  );
}
