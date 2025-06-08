import { z } from "zod/v4";

export const LoginDto = z.object({
  username: z.string().meta({
    description: "用户的唯一登录名",
    examples: ["admin"],
  }),
  password: z.string().meta({
    description: "用户的登录密码",
    examples: ["123456"],
  }),
});

export const LoginSuccessVo = z.object({
  id: z.number().meta({
    description: "用户唯一标识",
    examples: [1],
  }),
  token: z.string().meta({
    description: "用户认证令牌，用于后续接口鉴权",
    examples: ["token-123456"],
  }),
});

export const LoginErrorVo = z.object({
  message: z.string().meta({
    description: "错误信息",
    examples: ["Invalid username or password"],
  }),
});
