export const REFRESH_COOKIE = "refresh_token";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};
