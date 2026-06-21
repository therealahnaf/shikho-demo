export const USERNAME_KEY = "demo_username";
export const ACCESS_KEY = "demo_access_key";

export type DemoCredentials = {
  username: string;
  accessKey: string;
};

export function getCredentials(): DemoCredentials | null {
  const username = localStorage.getItem(USERNAME_KEY);
  const accessKey = localStorage.getItem(ACCESS_KEY);
  return username && accessKey ? { username, accessKey } : null;
}

export function saveCredentials(credentials: DemoCredentials): void {
  localStorage.setItem(USERNAME_KEY, credentials.username);
  localStorage.setItem(ACCESS_KEY, credentials.accessKey);
}

export function clearCredentials(): void {
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(ACCESS_KEY);
}

