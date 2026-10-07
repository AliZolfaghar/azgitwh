export const USER_ROLES = ['user', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
	user: 'عادی',
	admin: 'ادمین'
};

export function isUserRole(value: unknown): value is UserRole {
	return value === 'user' || value === 'admin';
}

export function parseRole(value: unknown, fallback: UserRole = 'user'): UserRole {
	return isUserRole(value) ? value : fallback;
}

export function isAdminRole(role: unknown): boolean {
	return role === 'admin';
}
