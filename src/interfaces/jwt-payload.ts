export interface JwtPayload {
  sub: string;
  email: string;
  name: string | null;
  role: string | null;
}
