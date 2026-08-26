import {compare,hash} from "bcryptjs";
import {z} from "zod";
import {prisma} from "@/lib/prisma";
import {apiError,AppError} from "@/lib/http";
import {requireSession} from "@/lib/session";
const schema=z.object({currentPassword:z.string().min(1),newPassword:z.string().min(10).max(128).regex(/[A-Z]/,"Include an uppercase letter.").regex(/[a-z]/,"Include a lowercase letter.").regex(/[0-9]/,"Include a number.")});
export async function POST(request:Request){try{const session=await requireSession();const input=schema.parse(await request.json());const user=await prisma.user.findUnique({where:{id:session.id}});if(!user||!await compare(input.currentPassword,user.passwordHash))throw new AppError(422,"PASSWORD_INCORRECT","Current password is incorrect.");const passwordHash=await hash(input.newPassword,12);await prisma.$transaction([prisma.user.update({where:{id:user.id},data:{passwordHash,failedLoginAttempts:0,lockedUntil:null}}),prisma.auditLog.create({data:{userId:user.id,action:"PASSWORD_CHANGED",entityType:"User",entityId:user.id}})]);return Response.json({ok:true})}catch(error){return apiError(error)}}
