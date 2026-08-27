import { MovementType, Prisma, RecordStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { AppError } from "./http";

type Line = { itemId: string; quantity: number };
const txCode = (prefix: string) => `${prefix}-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

function normalizeLines(lines: Line[]) {
  const merged = new Map<string, number>();
  for (const line of lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) throw new AppError(422, "INVALID_QUANTITY", "Quantity must be greater than zero.");
    merged.set(line.itemId, (merged.get(line.itemId) ?? 0) + line.quantity);
  }
  if (!merged.size) throw new AppError(422, "EMPTY_TRANSACTION", "Add at least one item.");
  return [...merged].map(([itemId, quantity]) => ({ itemId, quantity: new Prisma.Decimal(quantity) }));
}

async function stockAlert(tx: Prisma.TransactionClient, itemId: string, name: string, quantity: Prisma.Decimal, minimum: Prisma.Decimal) {
  await tx.notification.updateMany({ where: { itemId, resolvedAt: null }, data: { resolvedAt: new Date() } });
  if (quantity.lte(minimum)) {
    const empty = quantity.eq(0);
    await tx.notification.create({ data: { itemId, type: empty ? "OUT_OF_STOCK" : "LOW_STOCK", title: empty ? `Out of Stock: ${name}` : `Low Stock Alert: ${name}`, message: empty ? `${name} is currently unavailable.` : `${name} has ${quantity} remaining. Minimum stock level is ${minimum}.` } });
  }
}

export async function issueStock(input: { employeeId: string; officerId: string; notes?: string; lines: Line[] }) {
  const lines = normalizeLines(input.lines);
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({ where: { id: input.employeeId }, include: { assignments: { where: { endsAt: null, isPrimary: true }, include: { client: true, location: true }, take: 1 } } });
    if (!employee) throw new AppError(404, "EMPLOYEE_NOT_FOUND", "Employee was not found.");
    if (employee.employmentStatus !== "ACTIVE") throw new AppError(422, "EMPLOYEE_INACTIVE", "This employee is currently inactive and cannot collect stock.");
    const assignment = employee.assignments[0];
    if (!assignment) throw new AppError(422, "ASSIGNMENT_REQUIRED", "The employee needs an active client and location assignment.");
    const items = await tx.inventoryItem.findMany({ where: { id: { in: lines.map((l) => l.itemId) } } });
    if (items.length !== lines.length) throw new AppError(404, "ITEM_NOT_FOUND", "One or more inventory items were not found.");
    const code = txCode("ISS");
    const issue = await tx.stockIssue.create({ data: { transactionCode: code, employeeId: employee.id, clientId: assignment.clientId, locationId: assignment.locationId, employeeName: employee.fullName, clientName: assignment.client.companyName, locationName: assignment.location.name, officerId: input.officerId, notes: input.notes } });
    for (const line of lines) {
      const item = items.find((candidate) => candidate.id === line.itemId)!;
      if (item.status !== RecordStatus.ACTIVE) throw new AppError(422, "ITEM_INACTIVE", `${item.name} is inactive and cannot be issued.`);
      if (item.currentQuantity.lt(line.quantity)) throw new AppError(409, "INSUFFICIENT_STOCK", `Insufficient stock. Only ${item.currentQuantity} ${item.unit} of ${item.name} are currently available.`);
      const next = item.currentQuantity.minus(line.quantity);
      const changed = await tx.inventoryItem.updateMany({ where: { id: item.id, version: item.version, currentQuantity: { gte: line.quantity } }, data: { currentQuantity: next, version: { increment: 1 } } });
      if (changed.count !== 1) throw new AppError(409, "STOCK_CHANGED", `${item.name} stock changed. Review and submit again.`);
      await tx.stockIssueItem.create({ data: { issueId: issue.id, itemId: item.id, itemName: item.name, unit: item.unit, quantity: line.quantity } });
      await tx.stockMovement.create({ data: { transactionCode: code, movementType: MovementType.STOCK_ISSUED, itemId: item.id, quantity: line.quantity, previousQuantity: item.currentQuantity, newQuantity: next, employeeId: employee.id, clientId: assignment.clientId, locationId: assignment.locationId, officerId: input.officerId, issueId: issue.id, notes: input.notes } });
      await stockAlert(tx, item.id, item.name, next, item.minimumStockLevel);
    }
    await tx.auditLog.create({ data: { userId: input.officerId, action: "STOCK_ISSUED", entityType: "StockIssue", entityId: issue.id, newValue: { transactionCode: code } } });
    return tx.stockIssue.findUniqueOrThrow({ where: { id: issue.id }, include: { items: true } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function receiveStock(input: { officerId: string; supplier: string; reference?: string; notes?: string; receivedAt?: Date; lines: (Line & { unitCost?: number })[] }) {
  const lines = normalizeLines(input.lines);
  return prisma.$transaction(async (tx) => {
    const items = await tx.inventoryItem.findMany({ where: { id: { in: lines.map((l) => l.itemId) } } });
    if (items.length !== lines.length) throw new AppError(404, "ITEM_NOT_FOUND", "One or more inventory items were not found.");
    const code = txCode("REC");
    const receipt = await tx.stockReceipt.create({ data: { transactionCode: code, supplier: input.supplier, reference: input.reference, notes: input.notes, receivedAt: input.receivedAt, officerId: input.officerId } });
    for (const line of lines) {
      const item = items.find((candidate) => candidate.id === line.itemId)!;
      const next = item.currentQuantity.plus(line.quantity);
      await tx.inventoryItem.update({ where: { id: item.id }, data: { currentQuantity: next, version: { increment: 1 } } });
      await tx.stockReceiptItem.create({ data: { receiptId: receipt.id, itemId: item.id, itemName: item.name, unit: item.unit, quantity: line.quantity } });
      await tx.stockMovement.create({ data: { transactionCode: code, movementType: MovementType.STOCK_RECEIVED, itemId: item.id, quantity: line.quantity, previousQuantity: item.currentQuantity, newQuantity: next, officerId: input.officerId, receiptId: receipt.id, reference: input.reference, notes: input.notes } });
      await stockAlert(tx, item.id, item.name, next, item.minimumStockLevel);
    }
    await tx.auditLog.create({ data: { userId: input.officerId, action: "STOCK_RECEIVED", entityType: "StockReceipt", entityId: receipt.id, newValue: { transactionCode: code } } });
    return tx.stockReceipt.findUniqueOrThrow({ where: { id: receipt.id }, include: { items: true } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function transferStock(input: {
  itemId: string;
  officerId: string;
  quantity: number;
  from: string;
  to: string;
  printReceipt?: boolean;
}) {
  validateTransferInput(input.quantity, input.from, input.to);

  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) throw new AppError(404, "ITEM_NOT_FOUND", "Product was not found.");
    if (item.status !== RecordStatus.ACTIVE)
      throw new AppError(422, "ITEM_INACTIVE", `${item.name} is inactive.`);
    const quantity = new Prisma.Decimal(input.quantity);
    if (item.currentQuantity.lt(quantity))
      throw new AppError(409, "INSUFFICIENT_STOCK", `Only ${item.currentQuantity} ${item.unit} of ${item.name} are available.`);

    const next = item.currentQuantity.minus(quantity);
    const changed = await tx.inventoryItem.updateMany({
      where: { id: item.id, version: item.version, currentQuantity: { gte: quantity } },
      data: { currentQuantity: next, version: { increment: 1 } },
    });
    if (changed.count !== 1)
      throw new AppError(409, "STOCK_CHANGED", `${item.name} stock changed. Review and submit again.`);

    const code = txCode("TRF");
    const movement = await tx.stockMovement.create({
      data: {
        transactionCode: code,
        movementType: MovementType.STOCK_ISSUED,
        itemId: item.id,
        quantity,
        previousQuantity: item.currentQuantity,
        newQuantity: next,
        officerId: input.officerId,
        sourceLocation: input.from,
        destinationLocation: input.to,
        printReceipt: input.printReceipt ?? false,
        reference: `${input.from} → ${input.to}`,
      },
    });
    await stockAlert(tx, item.id, item.name, next, new Prisma.Decimal(9));
    await tx.auditLog.create({
      data: {
        userId: input.officerId,
        action: "STOCK_TRANSFERRED",
        entityType: "StockMovement",
        entityId: movement.id,
        newValue: { transactionCode: code, item: item.name, quantity: input.quantity, from: input.from, to: input.to },
      },
    });
    return movement;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function validateTransferInput(quantity: number, from: string, to: string) {
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw new AppError(422, "INVALID_QUANTITY", "Quantity must be a whole number greater than zero.");
  if (from === to)
    throw new AppError(422, "SAME_LOCATION", "Source and destination must be different.");
}

export async function returnStock(input:{employeeId:string;officerId:string;originalIssueId?:string;notes?:string;lines:Line[]}){
  const lines=normalizeLines(input.lines);
  return prisma.$transaction(async tx=>{
    const employee=await tx.employee.findUnique({where:{id:input.employeeId},include:{assignments:{where:{endsAt:null,isPrimary:true},take:1}}});
    if(!employee)throw new AppError(404,"EMPLOYEE_NOT_FOUND","Employee was not found.");
    const assignment=employee.assignments[0];
    if(!assignment)throw new AppError(422,"ASSIGNMENT_REQUIRED","The employee needs an active client and location assignment.");
    const items=await tx.inventoryItem.findMany({where:{id:{in:lines.map(line=>line.itemId)}}});
    if(items.length!==lines.length)throw new AppError(404,"ITEM_NOT_FOUND","One or more inventory items were not found.");
    const originalIssue=input.originalIssueId?await tx.stockIssue.findFirst({where:{id:input.originalIssueId,employeeId:employee.id},include:{items:true,returns:{include:{items:true}}}}):null;
    if(input.originalIssueId&&!originalIssue)throw new AppError(404,"ISSUE_NOT_FOUND","The original issue was not found for this employee.");
    if(originalIssue){for(const line of lines){const issued=originalIssue.items.find(i=>i.itemId===line.itemId);const already=originalIssue.returns.flatMap(r=>r.items).filter(i=>i.itemId===line.itemId).reduce((sum,i)=>sum.plus(i.quantity),new Prisma.Decimal(0));if(!issued||issued.quantity.minus(already).lt(line.quantity))throw new AppError(422,"RETURN_EXCEEDS_ISSUE","Returned quantity cannot exceed the quantity still eligible for return.");}}
    const code=txCode("RET");
    const returned=await tx.stockReturn.create({data:{transactionCode:code,originalIssueId:input.originalIssueId,employeeId:employee.id,clientId:assignment.clientId,locationId:assignment.locationId,officerId:input.officerId,notes:input.notes}});
    for(const line of lines){const item=items.find(candidate=>candidate.id===line.itemId)!;const next=item.currentQuantity.plus(line.quantity);const issueItem=originalIssue?.items.find(candidate=>candidate.itemId===line.itemId);await tx.inventoryItem.update({where:{id:item.id},data:{currentQuantity:next,version:{increment:1}}});await tx.stockReturnItem.create({data:{returnId:returned.id,issueItemId:issueItem?.id,itemId:item.id,itemName:item.name,unit:item.unit,quantity:line.quantity}});await tx.stockMovement.create({data:{transactionCode:code,movementType:MovementType.STOCK_RETURNED,itemId:item.id,quantity:line.quantity,previousQuantity:item.currentQuantity,newQuantity:next,employeeId:employee.id,clientId:assignment.clientId,locationId:assignment.locationId,officerId:input.officerId,returnId:returned.id,notes:input.notes}});await stockAlert(tx,item.id,item.name,next,item.minimumStockLevel)}
    await tx.auditLog.create({data:{userId:input.officerId,action:"STOCK_RETURNED",entityType:"StockReturn",entityId:returned.id,newValue:{transactionCode:code}}});
    return tx.stockReturn.findUniqueOrThrow({where:{id:returned.id},include:{items:true}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
