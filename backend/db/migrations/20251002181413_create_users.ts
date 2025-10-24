import type { Knex } from "knex";
import { UserTableName } from "../../src/interfaces";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(UserTableName, (table) => {
    table.uuid("id").primary();
    table.string("username").notNullable().index();
    table.string("email").notNullable().unique();
    table.string("password").notNullable();
    table.integer("role").unsigned().notNullable().defaultTo(5);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(UserTableName);
}
