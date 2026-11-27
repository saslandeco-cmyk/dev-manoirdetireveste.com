import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
const schema = z.object({arrival:z.string(),departure:z.string(),guests:z.coerce.number().int().min(1).max(20),type:z.enum(["ALL","ROOM","COTTAGE"]).default("ALL")});
export async function GET(req:NextRequest) {
 const parsed=schema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
 if(!parsed.success) return NextResponse.json({error:"Paramètres de recherche invalides."},{status:400});
 const {arrival,departure,guests,type}=parsed.data; const a=new Date(`${arrival}T00:00:00.000Z`), d=new Date(`${departure}T00:00:00.000Z`);
 if(isNaN(a.getTime())||isNaN(d.getTime())||d<=a) return NextResponse.json({error:"Les dates sélectionnées sont invalides."},{status:400});
 const stays=await prisma.accommodation.findMany({where:{active:true,capacity:{gte:guests},...(type==="ALL"?{}:{type}),bookings:{none:{status:{in:["CONFIRMED","PENDING_PAYMENT"]},arrival:{lt:d},departure:{gt:a},OR:[{status:"CONFIRMED"},{expiresAt:{gt:new Date()}}]}},blocks:{none:{startDate:{lt:d},endDate:{gt:a}}}},select:{id:true,name:true,type:true,capacity:true,basePrice:true},orderBy:{sortOrder:"asc"}});
 return NextResponse.json({stays});
}
