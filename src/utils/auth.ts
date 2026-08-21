export interface AdminUser {
  email: string;
  name: string;
  role: 'admin';
  loggedInAt: string;
}

const AUTH_STORAGE_KEYS = {
  CURRENT_ADMIN: 'efootball_current_admin_session',
  ADMIN_ACCOUNTS: 'efootball_admin_accounts_list',
};

const DEFAULT_ADMIN_ACCOUNTS = [
  {
    email: (import.meta.env.VITE_ADMIN_DEFAULT_EMAIL as string) || '',
    password: (import.meta.env.VITE_ADMIN_DEFAULT_PASSWORD as string) || '',
    name: (import.meta.env.VITE_ADMIN_DEFAULT_NAME as string) || 'League Administrator',
  },
].filter((acc) => Boolean(acc.email && acc.password));

export function getAdminAccounts() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.ADMIN_ACCOUNTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_ADMIN_ACCOUNTS;
}

export function getCurrentAdmin(): AdminUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_ADMIN);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return null;
}

export function loginAdmin(email: string, password: string): { success: boolean; error?: string; user?: AdminUser } {
  const accounts = getAdminAccounts();
  const normalizedEmail = email.trim().toLowerCase();
  
  const found = accounts.find(
    (acc: { email: string; password: string; name: string }) =>
      acc.email.toLowerCase() === normalizedEmail && acc.password === password
  );

  if (!found) {
    return {
      success: false,
      error: 'Invalid admin email or password. Please check your credentials.',
    };
  }

  const adminUser: AdminUser = {
    email: found.email,
    name: found.name,
    role: 'admin',
    loggedInAt: new Date().toISOString(),
  };

  localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_ADMIN, JSON.stringify(adminUser));
  return { success: true, user: adminUser };
}

export function logoutAdmin(): void {
  localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_ADMIN);
}

export function registerOrUpdateAdmin(email: string, password: string, name: string): void {
  const accounts = getAdminAccounts();
  const filtered = accounts.filter((a: { email: string }) => a.email.toLowerCase() !== email.toLowerCase());
  filtered.push({ email: email.trim(), password, name: name.trim() });
  localStorage.setItem(AUTH_STORAGE_KEYS.ADMIN_ACCOUNTS, JSON.stringify(filtered));
}
