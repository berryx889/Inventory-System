import { z } from "zod";
import { apiError } from "@/lib/http";
import { requirePermission } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { transferStock } from "@/lib/stock";

const locations = ["Storage A", "Storage B", "Sales Floor", "Customer", "Waste"] as const;
const schema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().positive(),
  from: z.enum(locations),
  to: z.enum(locations),
  printReceipt: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    requirePermission(user.role, "stock:issue");
    const transaction = await transferStock({ ...schema.parse(await request.json()), officerId: user.id });
    return Response.json({ transaction }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
