import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for database seeding.`);
  return value;
}

function assertStrongPassword(password: string) {
  if (password.length < 14 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error("SEED_ADMIN_PASSWORD must have at least 14 characters and include uppercase, lowercase, a number, and a symbol.");
  }
}

async function main() {
  const adminEmail = required("SEED_ADMIN_EMAIL").toLowerCase();
  const adminPassword = required("SEED_ADMIN_PASSWORD");
  const adminName = process.env.SEED_ADMIN_NAME?.trim() || "System Administrator";
  assertStrongPassword(adminPassword);
  const passwordHash = await hash(adminPassword, 12);

  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: { name: adminName, passwordHash, role: "ADMIN", status: "ACTIVE", failedLoginAttempts: 0, lockedUntil: null },
    create: { name: adminName, email: adminEmail, passwordHash, role: "ADMIN" },
  });

  await db.auditLog.create({ data: { userId: admin.id, action: "PRODUCTION_ADMIN_BOOTSTRAPPED", entityType: "System" } });

  if (process.env.SEED_DEMO_DATA !== "true") {
    console.log("Production administrator is ready.");
    return;
  }

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
  console.log("Administrator and demo warehouse data are ready.");
}

main().finally(() => db.$disconnect());
