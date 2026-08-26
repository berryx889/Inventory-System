import {prisma} from "@/lib/prisma";
import {apiError} from "@/lib/http";
import {requireSession} from "@/lib/session";

export async function GET(request:Request){try{await requireSession();const employeeId=new URL(request.url).searchParams.get("employeeId")||"";const issues=await prisma.stockIssue.findMany({where:{employeeId,status:"COMPLETED"},include:{items:true,returns:{include:{items:true}}},orderBy:{issuedAt:"desc"},take:50});return Response.json({issues:issues.map(issue=>({id:issue.id,transactionCode:issue.transactionCode,issuedAt:issue.issuedAt,items:issue.items.map(line=>{const returned=issue.returns.flatMap(r=>r.items).filter(x=>x.itemId===line.itemId).reduce((sum,x)=>sum+Number(x.quantity),0);return{itemId:line.itemId,itemName:line.itemName,unit:line.unit,issued:Number(line.quantity),returned,remaining:Number(line.quantity)-returned}}).filter(line=>line.remaining>0)})).filter(issue=>issue.items.length)})}catch(error){return apiError(error)}}
