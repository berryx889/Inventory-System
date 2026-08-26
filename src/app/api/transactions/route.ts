import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { requireSession } from "@/lib/session";

export async function GET(request:Request){
  try{
    await requireSession();
    const params=new URL(request.url).searchParams;
    const itemId=params.get("itemId")||undefined;
    const rows=await prisma.stockMovement.findMany({where:itemId?{itemId}:undefined,include:{item:true,employee:true,client:true,location:true,officer:true},orderBy:{createdAt:"desc"},take:250});
    return Response.json({transactions:rows.map(row=>({id:row.id,transactionCode:row.transactionCode,type:row.movementType,itemId:row.itemId,item:row.item.name,quantity:Number(row.quantity),unit:row.item.unit,previousQuantity:Number(row.previousQuantity),newQuantity:Number(row.newQuantity),employee:row.employee?.fullName??null,client:row.client?.companyName??null,location:row.location?.name??null,officer:row.officer.name,reference:row.reference,notes:row.notes,createdAt:row.createdAt}))});
  }catch(error){return apiError(error)}
}
