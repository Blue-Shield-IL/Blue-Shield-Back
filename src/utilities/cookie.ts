import { Response } from "express";
import { REFRESH_COOKIE, COOKIE_OPTIONS } from "@Constants/auth";

const LEGACY_COOKIE_OPTIONS = { ...COOKIE_OPTIONS, path: "/auth" };

export const setRefreshCookie = (res: Response, token: string) => {
  res.clearCookie(REFRESH_COOKIE, LEGACY_COOKIE_OPTIONS);
  return res.cookie(REFRESH_COOKIE, token, COOKIE_OPTIONS);
};

export const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE, LEGACY_COOKIE_OPTIONS);
  return res.clearCookie(REFRESH_COOKIE, COOKIE_OPTIONS);
};