import z from "zod/v4";

export const UserIdDto = z.object({
  id: z.string().meta({ description: "用户ID" }),
});

export const UpdateUserDto = z.object({
  email: z.email().meta({
    description: "用户邮箱地址",
    examples: ["john.doe@example.com"],
  }),
  displayName: z
    .string()
    .min(2)
    .max(50)
    .optional()
    .meta({
      description: "用户显示名称",
      examples: ["John Doe"],
    }),
  avatar: z
    .url()
    .optional()
    .meta({
      description: "头像URL",
      examples: ["https://cdn.example.com/avatars/user123.jpg"],
    }),
});

export const UpdateUserVo = z.object({
  success: z.boolean().meta({
    description: "是否成功",
    examples: [true],
  }),
  data: z
    .object({
      id: z.uuid().meta({
        description: "用户ID",
        examples: ["123e4567-e89b-12d3-a456-426614174000"],
      }),
    })
    .meta({ description: "返回数据" }),
});

export const UserNotFoundVo = z.object({
  success: z.boolean().meta({
    description: "是否成功",
    examples: [false],
  }),
  error: z.object({
    code: z.string().meta({
      description: "错误码",
      examples: ["USER_NOT_FOUND"],
    }),
    message: z.string().meta({
      description: "错误消息",
      examples: ["指定的用户不存在"],
    }),
  }),
});

export const UserVo = z.object({
  id: z.string().meta({ description: "用户ID" }),
  username: z.string().meta({ description: "用户名" }),
  email: z.email().meta({ description: "邮箱" }),
  avatar: z.url().optional().meta({ description: "头像URL" }),
  createdAt: z.iso.datetime().meta({ description: "创建时间" }),
  updatedAt: z.iso.datetime().meta({ description: "更新时间" }),
});

export const SpecialAttributesVo = z.object({
  deprecatedField: z.string().meta({
    description: "已废弃的字段",
    deprecated: true,
    allowEmptyValue: true,
    example: "old-value",
    examples: {
      example1: { value: "value1", description: "示例1" },
      example2: { value: "value2", description: "示例2" },
    },
  }),
  optionalField: z.string().optional().meta({
    description: "可选字段",
  }),
});
