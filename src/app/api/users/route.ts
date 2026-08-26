import {hash} from "bcryptjs";
import {z} from "zod";
import {prisma} from "@/lib/prisma";
import {apiError} from "@/lib/http";
import {requirePermission} from "@/lib/rbac";
import {requireSession} from "@/lib/session";
const schema=z.object({name:z.string().trim().min(2).max(120),email:z.email(),role:z.enum(["ADMIN","WAREHOUSE_OFFICER","MANAGER","STAFF"]),password:z.string().min(10).max(128)});
export async function GET(){try{const user=await requireSession();requirePermission(user.role,"users:manage");const users=await prisma.user.findMany({select:{id:true,name:true,email:true,role:true,status:true,lastLoginAt:true,createdAt:true},orderBy:{name:"asc"}});return Response.json({users})}catch(error){return apiError(error)}}
export async function POST(request:Request){try{const actor=await requireSession();requirePermission(actor.role,"users:manage");const input=schema.parse(await request.json());const passwordHash=await hash(input.password,12);const user=await prisma.$transaction(async tx=>{const created=await tx.user.create({data:{name:input.name,email:input.email.toLowerCase(),role:input.role,passwordHash}});await tx.auditLog.create({data:{userId:actor.id,action:"USER_CREATED",entityType:"User",entityId:created.id,newValue:{name:created.name,email:created.email,role:created.role}}});return created});return Response.json({user:{id:user.id,name:user.name,email:user.email,role:user.role,status:user.status}},{status:201})}catch(error){return apiError(error)}}
