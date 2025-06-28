import { z } from "zod/v4";

export const UserIdDto = z.object({
  id: z.string().meta({ description: "用户ID" }),
});

export const UpdateUserDto = z.object({
  email: z.email().meta({
    description: "用户邮箱地址",
    examples: ["john.doe@example.com"],
  }),
  username: z
    .string()
    .min(3)
    .max(50)
    .meta({
      description: "用户名",
      examples: ["John Doe"],
    }),
});

export const UpdateUserVo = z.object({
  id: z.string().meta({ description: "用户ID" }),
  email: z.email().meta({
    description: "用户邮箱地址",
    examples: ["john.doe@example.com"],
  }),
  username: z
    .string()
    .min(3)
    .max(50)
    .meta({
      description: "用户名",
      examples: ["John Doe"],
    }),
});
