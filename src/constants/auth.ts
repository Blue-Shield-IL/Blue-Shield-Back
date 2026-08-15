export const REFRESH_COOKIE = "refresh_token";

const useSecureCookies = process.env.COOKIE_SECURE === "true";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: useSecureCookies,
  sameSite: useSecureCookies ? ("none" as const) : ("lax" as const),
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};
