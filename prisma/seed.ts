import {PrismaClient,AccommodationType} from "@prisma/client";
const prisma=new PrismaClient();
async function main(){
 const rooms=[
  ["Les Myosotis","les-myosotis",2],["Les Fougères","les-fougeres",2],["La Rose","la-rose",2],["Les Coquelicots","les-coquelicots",2],["Les Bleuets","les-bleuets",2]
 ];
 for(const [name,slug,capacity] of rooms){
  await prisma.accommodation.upsert({where:{slug:slug as string},update:{},create:{name:name as string,slug:slug as string,type:AccommodationType.ROOM,capacity:capacity as number,description:"Description à compléter et valider avec les propriétaires.",facilities:["Salle d'eau privée","Wi-Fi"],basePrice:8500,sortOrder:rooms.indexOf(rooms.find(x=>x[1]===slug)!)}})
 }
 console.log("Chambres de démonstration créées. Ajouter les gîtes exacts depuis la base ou l'administration.");
}
main().finally(()=>prisma.$disconnect());
