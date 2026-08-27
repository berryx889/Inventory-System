import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { requireSession } from "@/lib/session";
import { requirePermission } from "@/lib/rbac";
import { z } from "zod";

const createSchema = z.object({ sku:z.string().trim().min(2).max(40), name:z.string().trim().min(2).max(120), category:z.string().trim().min(2).max(80), unit:z.string().trim().min(1).max(30), minimumStockLevel:z.coerce.number().nonnegative(), maximumStockLevel:z.coerce.number().positive().optional(), unitCost:z.coerce.number().nonnegative().optional(), description:z.string().trim().max(1000).optional() });

export async function GET(request: Request) {
  try {
    await requireSession();
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const items = await prisma.inventoryItem.findMany({ where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : undefined, include: { category: true }, orderBy: { name: "asc" } });
    return Response.json({ items: items.map((item) => ({ ...item, currentQuantity: Number(item.currentQuantity), minimumStockLevel: Number(item.minimumStockLevel), maximumStockLevel: item.maximumStockLevel ? Number(item.maximumStockLevel) : null, unitCost: item.unitCost ? Number(item.unitCost) : null, inventoryStatus: item.currentQuantity.eq(0) ? "OUT_OF_STOCK" : item.currentQuantity.lt(10) ? "LOW_STOCK" : "IN_STOCK" })) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession(); requirePermission(user.role, "inventory:manage");
    const input = createSchema.parse(await request.json());
    const item = await prisma.$transaction(async tx => {
      const category = await tx.inventoryCategory.upsert({ where:{name:input.category}, update:{status:"ACTIVE"}, create:{name:input.category} });
      const created = await tx.inventoryItem.create({ data:{ sku:input.sku.toUpperCase(), name:input.name, categoryId:category.id, unit:input.unit, minimumStockLevel:input.minimumStockLevel, maximumStockLevel:input.maximumStockLevel, unitCost:input.unitCost, description:input.description } });
      await tx.auditLog.create({data:{userId:user.id,action:"INVENTORY_ITEM_CREATED",entityType:"InventoryItem",entityId:created.id,newValue:{sku:created.sku,name:created.name}}});
      return created;
    });
    return Response.json({item},{status:201});
  } catch(error) { return apiError(error); }
}
