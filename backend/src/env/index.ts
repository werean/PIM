import { config } from "dotenv";
import { treeifyError, z } from "zod";

//.env validation

config({ path: ".env" });
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DATABASE_CLIENT: z.enum(["sqlite", "pg"]),
  DATABASE_URL: z.string(),
  PORT: z.coerce.number().default(8080),
});

const _env = envSchema.safeParse(process.env);

if (_env.success === false) {
  console.log("Invalid environment variables.", z, treeifyError(_env.error));
  throw new Error("Invalid environment variables.");
}

export const env = _env.data; //database
