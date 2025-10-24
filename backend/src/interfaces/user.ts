type UserRole = 5 | 10 | 15;

export interface User {
  readonly id: string;
  username: string;
  email: string;
  password: string;
  readonly role: UserRole;
}

export const UserTableName = "users" as const;
