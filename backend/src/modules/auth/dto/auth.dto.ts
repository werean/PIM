import z from "zod";
export const loginSchema = z
  .object({
    email: z.email("Email inválido"),
    password: z.string().min(8, "Senha inválida"),
  })
  .strict();

export type LoginDTO = z.infer<typeof loginSchema>;
