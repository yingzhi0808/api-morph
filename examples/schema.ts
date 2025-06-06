import { z } from "zod/v4";

export const LoginDto = z.object({
  username: z.string().meta({ description: "用户名" }),
  password: z.string().meta({ description: "密码" }),
});

export const LoginVo = z.object({
  id: z.string().meta({ description: "用户ID" }),
  token: z.string().meta({ description: "访问令牌" }),
});
