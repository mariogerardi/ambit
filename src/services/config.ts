import services from "../../deployment/services.json";

// Development must opt in to a separate API; it never inherits production.
export function apiUrlForEnvironment(production: boolean, override?: string) {
  return (
    override || (production ? services.apiUrl : "http://127.0.0.1:3001")
  ).replace(/\/$/, "");
}
export const serviceConfig = {
  ...services,
  auth: {
    authority: import.meta.env.VITE_AUTH_AUTHORITY || services.auth.authority,
    clientId: import.meta.env.VITE_AUTH_CLIENT_ID || services.auth.clientId,
    loginUrl: import.meta.env.VITE_AUTH_LOGIN_URL || services.auth.loginUrl,
  },
  apiUrl: apiUrlForEnvironment(
    import.meta.env.PROD,
    import.meta.env.VITE_API_URL,
  ),
};
export const appRelease = __APP_RELEASE__;
