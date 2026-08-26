import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { apiError, AppError } from "@/lib/http";
import { requireSession } from "@/lib/session";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{await requireSession();const {id}=await params;const employee=await prisma.employee.findUnique({where:{id},select:{qrToken:true}});if(!employee)throw new AppError(404,"EMPLOYEE_NOT_FOUND","Employee was not found.");const png=await QRCode.toBuffer(employee.qrToken,{type:"png",width:480,margin:2,color:{dark:"#17352a",light:"#ffffff"}});return new Response(new Uint8Array(png),{headers:{"Content-Type":"image/png","Cache-Control":"private, max-age=3600"}})}catch(error){return apiError(error)}}
