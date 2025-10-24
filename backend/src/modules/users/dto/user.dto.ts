import { z } from "zod";

export const userSchema = z
  .object({
    username: z.string().min(2, "Nome deve conter no mínimo 2 caracteres."),
    email: z.string().email("Email deve ter formato válido"),
    password: z
      .string()
      .min(8, "A senha deve conter pelo menos 8 caracteres.")
      .refine((password) => /[A-Z]/.test(password), {
        message: "A senha deve conter pelo menos uma letra maiúscula.",
      })
      .refine((password) => /[a-z]/.test(password), {
        message: "A senha deve conter pelo menos uma letra minúscula.",
      })
      .refine((password) => /[0-9]/.test(password), {
        message: "A senha deve conter pelo menos um número.",
      })
      .refine((password) => /[^A-Za-z0-9]/.test(password), {
        message: "A senha deve conter pelo menos um caractere especial.",
      }),
    role: z.union([z.literal(5), z.literal(10), z.literal(15)]).default(5),
  })
  .strict();

export type UserDTO = z.infer<typeof userSchema>;
