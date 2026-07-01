export type AuthSession = {
  email: string;
  expiresAt: string;
  sub: string;
  user: string;
};

export type AuthSessionResponse = {
  authenticated: boolean;
  user?: AuthSession;
};
