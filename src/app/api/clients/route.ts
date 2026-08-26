import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { requirePermission } from "@/lib/rbac";
import { requireSession } from "@/lib/session";

const createSchema = z.object({ clientCode:z.string().trim().min(2).max(20), companyName:z.string().trim().min(2).max(120), contactPerson:z.string().trim().max(120).optional(), contactPhone:z.string().trim().max(30).optional(), contactEmail:z.union([z.email(),z.literal("")]).optional(), address:z.string().trim().max(300).optional(), notes:z.string().trim().max(1000).optional() });

export async function GET() {
  try {
    await requireSession();
    const clients=await prisma.client.findMany({ include:{ _count:{select:{locations:true,assignments:{where:{endsAt:null}}}}}, orderBy:{companyName:"asc"} });
    return Response.json({clients:clients.map(c=>({...c,locations:c._count.locations,employees:c._count.assignments}))});
  } catch(error){return apiError(error)}
}

export async function POST(request:Request) {
  try {
    const user=await requireSession(); requirePermission(user.role,"clients:manage"); const input=createSchema.parse(await request.json());
    const client=await prisma.$transaction(async tx=>{const created=await tx.client.create({data:{...input,clientCode:input.clientCode.toUpperCase(),contactEmail:input.contactEmail||null}});await tx.auditLog.create({data:{userId:user.id,action:"CLIENT_CREATED",entityType:"Client",entityId:created.id,newValue:{clientCode:created.clientCode,companyName:created.companyName}}});return created});
    return Response.json({client:{...client,locations:0,employees:0}},{status:201});
  } catch(error){return apiError(error)}
}
