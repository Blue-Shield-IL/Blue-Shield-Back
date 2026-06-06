import { Response } from "express";
import { REFRESH_COOKIE, COOKIE_OPTIONS } from "@Constants/auth";

export const setRefreshCookie = (res: Response, token: string) =>
  res.cookie(REFRESH_COOKIE, token, COOKIE_OPTIONS);

export const clearRefreshCookie = (res: Response) =>
  res.clearCookie(REFRESH_COOKIE, { path: "/auth" });
