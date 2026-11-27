import { NextRequest,NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
export async function POST(req:NextRequest){
 const stripe=new Stripe(process.env.STRIPE_SECRET_KEY!);const signature=req.headers.get("stripe-signature");
 if(!signature)return NextResponse.json({error:"Signature absente"},{status:400});
 let event:Stripe.Event;
 try{event=stripe.webhooks.constructEvent(await req.text(),signature,process.env.STRIPE_WEBHOOK_SECRET!)}catch(e){return NextResponse.json({error:"Signature invalide"},{status:400});}
 if(event.type==="checkout.session.completed"){
  const session=event.data.object as Stripe.Checkout.Session;const bookingId=session.metadata?.bookingId;
  if(bookingId){
   const booking=await prisma.booking.findUnique({where:{id:bookingId},include:{guest:true,accommodation:true}});
   if(booking&&booking.status!=="CONFIRMED"){
    await prisma.$transaction([
     prisma.booking.update({where:{id:bookingId},data:{status:"CONFIRMED",paymentStatus:"PAID",stripePaymentIntentId:typeof session.payment_intent==="string"?session.payment_intent:null}}),
     prisma.payment.updateMany({where:{bookingId,kind:"DEPOSIT"},data:{status:"PAID",stripePaymentIntentId:typeof session.payment_intent==="string"?session.payment_intent:null}})
    ]);
    if(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM){
     const resend=new Resend(process.env.RESEND_API_KEY);
     await resend.emails.send({from:process.env.EMAIL_FROM,to:booking.guest.email,subject:`Confirmation de votre séjour — ${booking.reference}`,html:`<h1>Votre réservation est confirmée</h1><p>Bonjour ${booking.guest.firstName},</p><p>Votre séjour au Manoir de Tireveste est confirmé.</p><p>Hébergement : ${booking.accommodation.name}<br>Référence : ${booking.reference}<br>Arrivée : ${booking.arrival.toLocaleDateString("fr-FR")}<br>Départ : ${booking.departure.toLocaleDateString("fr-FR")}</p><p>Le solde restant sera à régler selon les conditions communiquées par l'établissement.</p>`});
     if(process.env.BOOKING_NOTIFICATION_EMAIL)await resend.emails.send({from:process.env.EMAIL_FROM,to:process.env.BOOKING_NOTIFICATION_EMAIL,subject:`Nouvelle réservation ${booking.reference}`,html:`<p>Nouvelle réservation confirmée : ${booking.accommodation.name}, ${booking.reference}.</p>`});
    }
   }
  }
 }
 return NextResponse.json({received:true});
}
