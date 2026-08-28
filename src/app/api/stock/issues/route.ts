import { z } from "zod";
import { apiError } from "@/lib/http";
import { requirePermission } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { issueStock } from "@/lib/stock";

const schema = z.object({ locationId: z.string().min(1), notes: z.string().max(1000).optional(), lines: z.array(z.object({ itemId: z.string().min(1), quantity: z.number().positive() })).min(1) });
export async function POST(request: Request) {
  try {
    const user = await requireSession(); requirePermission(user.role, "stock:issue");
    const result = await issueStock({ ...schema.parse(await request.json()), officerId: user.id });
    return Response.json({ transaction: result }, { status: 201 });
  } catch (error) { return apiError(error); }
}
