import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const passwordHash = await hash("ChangeMe123!", 12);
  const admin = await db.user.upsert({ where: { email: "admin@warehouse.local" }, update: {}, create: { name: "Admin User", email: "admin@warehouse.local", passwordHash, role: "ADMIN" } });
  await db.user.upsert({ where: { email: "officer@warehouse.local" }, update: {}, create: { name: "Ama Owusu", email: "officer@warehouse.local", passwordHash, role: "WAREHOUSE_OFFICER" } });
  await db.user.upsert({ where: { email: "manager@warehouse.local" }, update: {}, create: { name: "Operations Manager", email: "manager@warehouse.local", passwordHash, role: "MANAGER" } });

  const client = await db.client.upsert({ where: { clientCode: "GCB" }, update: {}, create: { clientCode: "GCB", companyName: "GCB" } });
  const location = await db.location.upsert({ where: { locationCode: "GCB-HO" }, update: {}, create: { locationCode: "GCB-HO", name: "GCB Head Office", clientId: client.id } });
  const employee = await db.employee.upsert({ where: { employeeCode: "EMP-000245" }, update: {}, create: { employeeCode: "EMP-000245", fullName: "Kwame Mensah", phone: "+233 20 000 0245", jobTitle: "Cleaning Staff", qrToken: "EMP-000245", dateJoined: new Date("2024-01-15") } });
  const activeAssignment = await db.employeeAssignment.findFirst({ where: { employeeId: employee.id, endsAt: null } });
  if (!activeAssignment) await db.employeeAssignment.create({ data: { employeeId: employee.id, clientId: client.id, locationId: location.id } });

  const category = await db.inventoryCategory.upsert({ where: { name: "Cleaning Supplies" }, update: {}, create: { name: "Cleaning Supplies" } });
  const items = [
    { sku: "TR-001", name: "Toilet Roll", unit: "Rolls", currentQuantity: 250, minimumStockLevel: 50 },
    { sku: "LS-001", name: "Liquid Soap", unit: "Bottles", currentQuantity: 35, minimumStockLevel: 50 },
    { sku: "MOP-001", name: "Mop", unit: "Pieces", currentQuantity: 20, minimumStockLevel: 10 },
    { sku: "GLV-001", name: "Hand Gloves", unit: "Packs", currentQuantity: 0, minimumStockLevel: 15 },
  ];
  for (const item of items) await db.inventoryItem.upsert({ where: { sku: item.sku }, update: {}, create: { ...item, categoryId: category.id } });
  await db.auditLog.create({ data: { userId: admin.id, action: "SYSTEM_SEEDED", entityType: "System" } });
}

main().finally(() => db.$disconnect());
