import { NextRequest,NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { quoteStay } from "@/lib/pricing";
const schema=z.object({accommodationId:z.string().min(1),arrival:z.string(),departure:z.string(),guests:z.coerce.number().int().min(1),firstName:z.string().min(1),lastName:z.string().min(1),email:z.email(),phone:z.string().optional(),depositPercent:z.coerce.number().min(10).max(100).default(30)});
export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>null);const parsed=schema.safeParse(body);
 if(!parsed.success)return NextResponse.json({error:"Informations de réservation invalides."},{status:400});
 const v=parsed.data;const arrival=new Date(`${v.arrival}T00:00:00.000Z`),departure=new Date(`${v.departure}T00:00:00.000Z`);
 if(isNaN(arrival.getTime())||isNaN(departure.getTime())||departure<=arrival)return NextResponse.json({error:"Dates invalides."},{status:400});
 const quote=await quoteStay(v.accommodationId,arrival,departure);
 if(v.guests>quote.accommodation.capacity)return NextResponse.json({error:"Capacité dépassée."},{status:400});
 const overlap=await prisma.booking.findFirst({where:{accommodationId:v.accommodationId,arrival:{lt:departure},departure:{gt:arrival},OR:[{status:"CONFIRMED"},{status:"PENDING_PAYMENT",expiresAt:{gt:new Date()}}]}});
 const blocked=await prisma.availabilityBlock.findFirst({where:{accommodationId:v.accommodationId,startDate:{lt:departure},endDate:{gt:arrival}}});
 if(overlap||blocked)return NextResponse.json({error:"Ces dates viennent d'être réservées ou bloquées. Merci de relancer une recherche."},{status:409});
 const deposit=Math.round(quote.total*v.depositPercent/100),balance=quote.total-deposit;
 const reference=`MT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
 const guest=await prisma.guest.create({data:{firstName:v.firstName,lastName:v.lastName,email:v.email,phone:v.phone}});
 const booking=await prisma.booking.create({data:{reference,accommodationId:v.accommodationId,guestId:guest.id,arrival,departure,guests:v.guests,totalAmount:quote.total,depositAmount:deposit,balanceAmount:balance,expiresAt:new Date(Date.now()+20*60*1000),status:"PENDING_PAYMENT"}});
 const stripe=new Stripe(process.env.STRIPE_SECRET_KEY!);
 try{
  const session=await stripe.checkout.sessions.create({mode:"payment",customer_email:v.email,success_url:`${process.env.NEXT_PUBLIC_SITE_URL}/reservation/confirmation?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${process.env.NEXT_PUBLIC_SITE_URL}/reservation?cancelled=1`,metadata:{bookingId:booking.id,reference},line_items:[{quantity:1,price_data:{currency:"eur",unit_amount:deposit,product_data:{name:`Acompte réservation ${quote.accommodation.name}`,description:`${v.arrival} au ${v.departure} · Référence ${reference}`}}}]});
  await prisma.booking.update({where:{id:booking.id},data:{stripeSessionId:session.id}});
  await prisma.payment.create({data:{bookingId:booking.id,amount:deposit,kind:"DEPOSIT"}});
  return NextResponse.json({url:session.url});
 }catch(e){
  await prisma.booking.update({where:{id:booking.id},data:{status:"CANCELLED"}});
  console.error(e);return NextResponse.json({error:"Le paiement n'a pas pu être initialisé."},{status:502});
 }
}
