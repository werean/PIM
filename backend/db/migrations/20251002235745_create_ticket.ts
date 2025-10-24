import type { Knex } from "knex";
import { TicketTable } from "../../src/interfaces";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TicketTable, (table) => {
    table.increments("id").primary();
    table.string("title").notNullable();
    table.text("ticket_body").notNullable();
    table.string("urgency").notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(TicketTable);
}
