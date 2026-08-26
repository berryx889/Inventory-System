import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, AppError } from "@/lib/http";
import { createSession } from "@/lib/session";

const schema = z.object({ email: z.email(), password: z.string().min(8) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !(await compare(input.password, user.passwordHash))) {
      if (user) await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: { increment: 1 } } });
      throw new AppError(401, "INVALID_CREDENTIALS", "The email or password is incorrect.");
    }
    if (user.status !== "ACTIVE") throw new AppError(403, "ACCOUNT_INACTIVE", "This account is inactive.");
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } });
    await createSession({ id: user.id, name: user.name, email: user.email, role: user.role, employeeId: user.employeeId ?? undefined });
    return Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { return apiError(error); }
}
