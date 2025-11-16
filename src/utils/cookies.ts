/**
 * Cookie utility functions for client-side cookie management
 */

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
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (options.maxAge !== undefined) {
    cookieString += `; max-age=${options.maxAge}`;
  } else if (options.expires) {
    const expires =
      typeof options.expires === "number"
        ? new Date(Date.now() + options.expires * 864e5)
        : options.expires;
    cookieString += `; expires=${expires.toUTCString()}`;
  }

  if (options.path) {
    cookieString += `; path=${options.path}`;
  } else {
    cookieString += `; path=/`;
  }

  if (options.domain) {
    cookieString += `; domain=${options.domain}`;
  }

  if (options.secure) {
    cookieString += `; secure`;
  }

  if (options.sameSite) {
    const sameSiteValue =
      typeof options.sameSite === "boolean" ? "strict" : options.sameSite;
    cookieString += `; samesite=${sameSiteValue}`;
  }

  document.cookie = cookieString;
}

/**
 * Get a cookie value
 */
export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;

  const cookies = document.cookie.split("; ");
  const prefix = `${encodeURIComponent(name)}=`;

  for (const cookie of cookies) {
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.substring(prefix.length));
    }
  }

  return undefined;
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

  const cookies: Record<string, string> = {};
  const cookieStrings = document.cookie.split("; ");

  for (const cookie of cookieStrings) {
    const [name, value] = cookie.split("=");
    if (name && value) {
      cookies[decodeURIComponent(name)] = decodeURIComponent(value);
    }
  }

  return cookies;
}
