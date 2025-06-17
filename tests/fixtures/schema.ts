import z from "zod/v4";

export const UserIdVo = z.object({
  id: z.string().meta({ description: "用户ID" }),
});

/**
 * 用户登录响应数据
 */
export const UserLoginVo = z.object({
  id: z.string().meta({ description: "用户ID" }),
  username: z.string().meta({ description: "用户名" }),
  email: z.email().meta({ description: "邮箱" }),
  token: z.string().meta({ description: "访问令牌" }),
  refreshToken: z.string().meta({ description: "刷新令牌" }),
  expiresAt: z.iso.datetime().meta({ description: "令牌过期时间" }),
});

/**
 * 用户信息响应数据
 */
export const UserVo = z.object({
  id: z.string().meta({ description: "用户ID" }),
  username: z.string().meta({ description: "用户名" }),
  email: z.email().meta({ description: "邮箱" }),
  avatar: z.url().optional().meta({ description: "头像URL" }),
  createdAt: z.iso.datetime().meta({ description: "创建时间" }),
  updatedAt: z.iso.datetime().meta({ description: "更新时间" }),
});

/**
 * 错误响应数据
 */
export const ErrorVo = z.object({
  code: z.string().meta({ description: "错误代码" }),
  message: z.string().meta({ description: "错误消息" }),
  details: z.array(z.string()).optional().meta({ description: "错误详情" }),
  timestamp: z.iso.datetime().meta({ description: "错误发生时间" }),
});
