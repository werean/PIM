import { knex } from "../../../config/database.config";
import { User, UserTableName } from "../../interfaces";

// Service apenas encapsula as queries do knex, sem lógica adicional
export const userService = {
  findAll: (): Promise<User[]> => knex(UserTableName).select(),

  findById: (id: string): Promise<User | undefined> => knex(UserTableName).where({ id }).first(),

  findByEmail: (email: string): Promise<User> => knex(UserTableName).where({ email }).first(),

  insert: (user: User): Promise<void> => knex(UserTableName).insert(user),

  delete: (id: string): Promise<number> => knex(UserTableName).where({ id }).del(),

  put: (id: string, data: Omit<User, "id">): Promise<User | undefined> =>
    knex(UserTableName).where({ id }).update(data),
};
