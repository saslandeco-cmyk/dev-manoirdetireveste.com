import {prisma} from "@/lib/prisma";
import {euros} from "@/lib/money";
export const dynamic="force-dynamic";
export default async function Dashboard(){
 const now=new Date();const month=new Date(now.getFullYear(),now.getMonth(),1);
 const [bookings,upcoming,paid]=await Promise.all([
  prisma.booking.count({where:{status:"CONFIRMED"}}),
  prisma.booking.findMany({where:{status:"CONFIRMED",arrival:{gte:now}},include:{guest:true,accommodation:true},orderBy:{arrival:"asc"},take:8}),
  prisma.payment.aggregate({where:{status:"PAID",createdAt:{gte:month}},_sum:{amount:true}})
 ]);
 return <main className="admin-main"><p className="eyebrow">PILOTAGE DE L'ÉTABLISSEMENT</p><h1>Tableau de bord</h1><div className="stat-grid"><div className="stat">Réservations confirmées<strong>{bookings}</strong></div><div className="stat">Encaissements du mois<strong>{euros(paid._sum.amount||0)}</strong></div><div className="stat">Arrivées à venir<strong>{upcoming.length}</strong></div><div className="stat">Statut<strong>En exploitation</strong></div></div><section className="panel"><h2>Prochaines arrivées</h2><table className="table"><thead><tr><th>Date</th><th>Client</th><th>Hébergement</th><th>Référence</th></tr></thead><tbody>{upcoming.map(b=><tr key={b.id}><td>{b.arrival.toLocaleDateString("fr-FR")}</td><td>{b.guest.firstName} {b.guest.lastName}</td><td>{b.accommodation.name}</td><td>{b.reference}</td></tr>)}</tbody></table></section><p className="notice">Version initiale : les indicateurs seront enrichis avec le taux d'occupation, les soldes à recevoir, les annulations et les statistiques par période.</p></main>;
}
