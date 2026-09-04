import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { requirePermission } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
const schema=z.object({locationCode:z.string().trim().min(2).max(30),name:z.string().trim().min(2).max(120),address:z.string().trim().max(300).optional()});
export async function GET(){try{await requireSession();return Response.json({locations:await prisma.location.findMany({where:{status:"ACTIVE"},orderBy:{name:"asc"}})})}catch(error){return apiError(error)}}
export async function POST(request:Request){try{const user=await requireSession();requirePermission(user.role,"clients:manage");const input=schema.parse(await request.json());const location=await prisma.$transaction(async tx=>{const owner=await tx.client.upsert({where:{clientCode:"LOCATIONS"},update:{status:"ACTIVE"},create:{clientCode:"LOCATIONS",companyName:"Locations"}});const row=await tx.location.create({data:{...input,clientId:owner.id,locationCode:input.locationCode.toUpperCase()}});await tx.auditLog.create({data:{userId:user.id,action:"LOCATION_CREATED",entityType:"Location",entityId:row.id,newValue:{name:row.name}}});return row});return Response.json({location},{status:201})}catch(error){return apiError(error)}}
