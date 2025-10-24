import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { userSchema, UserDTO } from "./dto/user.dto";
import { userService } from "./user.service";
import { User } from "../../interfaces";
import bcrypt from "bcrypt";

export async function userController(server: FastifyInstance) {
  server.post("/create", async (req: FastifyRequest<{ Body: UserDTO }>, res) => {
    const parsedUser = userSchema.safeParse(req.body);
    if (!parsedUser.success) {
      return res.code(301).send({ message: "Cadastra certo ai!" });
    }
    const userId = crypto.randomUUID();
    const { email, password, username, role } = parsedUser.data;
    const verifyEmail = await userService.findByEmail(email);
    if (verifyEmail) {
      return res.code(301).send({ message: "E-mail já cadastrado." });
    }
    const salt = Number(process.env.BCRYPT_SALT) || 3;

    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser: User = {
      id: userId,
      email,
      password: hashedPassword,
      username,
      role,
    };
    try {
      await userService.insert(newUser);
      return res
        .status(201)
        .send({ message: "Usuário criado com sucesso!", newUser: { email, username, role } });
    } catch (e) {
      res.code(301).send({ message: "Falha ao criar usuário" });
    }
  });

  server.delete<{ Params: { id: string } }>("/delete/:id", async (req, res) => {
    const { id } = req.params;
    const user = await userService.findById(id);

    if (!user) {
      return res.status(404).send({ message: "Usuário não encontrado." });
    }

    await userService.delete(id);
    return res.status(200).send({
      message: "Usuario deletado.",
      user,
    });
  });

  server.get<{ Params: { id: string } }>("/find/:id", async (req, res) => {
    const { id } = req.params;
    const user = await userService.findById(id);

    if (!user) {
      return res.status(404).send({
        message: "Usuário não encontrado.",
      });
    }

    return res.status(200).send({ user });
  });

  server.get("/list", async (req, res) => {
    const users = await userService.findAll();

    if (users.length === 0) {
      return res.status(200).send({
        message: "Ainda não possui usuários cadastrados.",
      });
    }

    return res.status(200).send({ users });
  });

  server.put<{ Params: { id: string } }>("/edit/:id", async (req, res) => {
    const { id } = req.params;
    const user = await userService.findById(id);
    if (!user) {
      return res.status(404).send({
        message: "Usuário não encontrado.",
      });
    }
    const { username, email, password, role } = userSchema.parse(req.body);
    const putUser: User = { id, username, email, password, role };
    await userService.put(id, putUser);
    return res.status(201).send({ message: "Usuário editado com sucesso!", user: putUser });
  });
}
