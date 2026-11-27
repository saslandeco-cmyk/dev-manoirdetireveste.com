import { prisma } from "@/lib/prisma";
import { euros, nightsBetween } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysInMonth = Math.round((monthEnd.getTime() - monthStart.getTime()) / 86400000);

  const [
    confirmedCount,
    upcoming,
    paidThisMonth,
    activeAccommodations,
    monthBookings,
    arrivalsToday,
    departuresToday,
    pendingBalances,
    pendingBalanceAgg
  ] = await Promise.all([
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.findMany({ where: { status: "CONFIRMED", arrival: { gte: now } }, include: { guest: true, accommodation: true }, orderBy: { arrival: "asc" }, take: 8 }),
    prisma.payment.aggregate({ where: { status: "PAID", createdAt: { gte: monthStart, lt: monthEnd } }, _sum: { amount: true } }),
    prisma.accommodation.count({ where: { active: true } }),
    prisma.booking.findMany({ where: { status: { in: ["CONFIRMED", "COMPLETED"] }, arrival: { lt: monthEnd }, departure: { gt: monthStart } }, select: { arrival: true, departure: true } }),
    prisma.booking.findMany({ where: { status: "CONFIRMED", arrival: { gte: todayStart, lt: todayEnd } }, include: { guest: true, accommodation: true }, orderBy: { accommodation: { name: "asc" } } }),
    prisma.booking.findMany({ where: { status: { in: ["CONFIRMED", "COMPLETED"] }, departure: { gte: todayStart, lt: todayEnd } }, include: { guest: true, accommodation: true }, orderBy: { accommodation: { name: "asc" } } }),
    prisma.booking.findMany({ where: { status: "CONFIRMED", balanceAmount: { gt: 0 } }, include: { guest: true }, orderBy: { balanceDueAt: "asc" }, take: 8 }),
    prisma.booking.aggregate({ where: { status: "CONFIRMED", balanceAmount: { gt: 0 } }, _sum: { balanceAmount: true }, _count: true })
  ]);

  let occupiedNights = 0;
  for (const b of monthBookings) {
    const start = b.arrival < monthStart ? monthStart : b.arrival;
    const end = b.departure > monthEnd ? monthEnd : b.departure;
    occupiedNights += nightsBetween(start, end);
  }
  const totalNights = activeAccommodations * daysInMonth;
  const occupancyRate = totalNights > 0 ? Math.round((occupiedNights / totalNights) * 100) : 0;

  return (
    <main className="admin-main">
      <p className="eyebrow">PILOTAGE DE L'ÉTABLISSEMENT</p>
      <h1>Tableau de bord</h1>

      <div className="stat-grid">
        <div className="stat">Chiffre d'affaires du mois<strong>{euros(paidThisMonth._sum.amount || 0)}</strong></div>
        <div className="stat">Réservations à venir<strong>{confirmedCount}</strong></div>
        <div className="stat">Taux d'occupation du mois<strong>{occupancyRate}%</strong></div>
        <div className="stat">Paiements en attente<strong>{pendingBalanceAgg._count}</strong></div>
      </div>

      <section className="panel">
        <h2>Arrivées et départs du jour</h2>
        <table className="table">
          <thead><tr><th>Mouvement</th><th>Client</th><th>Hébergement</th><th>Référence</th></tr></thead>
          <tbody>
            {arrivalsToday.map(b => (
              <tr key={`a-${b.id}`}><td>Arrivée</td><td>{b.guest.firstName} {b.guest.lastName}</td><td>{b.accommodation.name}</td><td>{b.reference}</td></tr>
            ))}
            {departuresToday.map(b => (
              <tr key={`d-${b.id}`}><td>Départ</td><td>{b.guest.firstName} {b.guest.lastName}</td><td>{b.accommodation.name}</td><td>{b.reference}</td></tr>
            ))}
          </tbody>
        </table>
        {!arrivalsToday.length && !departuresToday.length && <p className="notice">Aucune arrivée ni départ prévu aujourd'hui.</p>}
      </section>

      <section className="panel">
        <h2>Prochaines réservations</h2>
        <table className="table">
          <thead><tr><th>Date</th><th>Client</th><th>Hébergement</th><th>Référence</th></tr></thead>
          <tbody>{upcoming.map(b => <tr key={b.id}><td>{b.arrival.toLocaleDateString("fr-FR")}</td><td>{b.guest.firstName} {b.guest.lastName}</td><td>{b.accommodation.name}</td><td>{b.reference}</td></tr>)}</tbody>
        </table>
        {!upcoming.length && <p className="notice">Aucune réservation confirmée à venir.</p>}
      </section>

      <section className="panel">
        <h2>Paiements en attente</h2>
        <p className="muted">Solde restant à percevoir : <strong>{euros(pendingBalanceAgg._sum.balanceAmount || 0)}</strong> sur {pendingBalanceAgg._count} réservation(s).</p>
        <table className="table">
          <thead><tr><th>Référence</th><th>Client</th><th>Solde dû</th><th>Échéance</th></tr></thead>
          <tbody>
            {pendingBalances.map(b => (
              <tr key={b.id}>
                <td>{b.reference}</td>
                <td>{b.guest.firstName} {b.guest.lastName}</td>
                <td>{euros(b.balanceAmount)}</td>
                <td>{b.balanceDueAt ? b.balanceDueAt.toLocaleDateString("fr-FR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!pendingBalances.length && <p className="notice">Aucun solde en attente de paiement.</p>}
      </section>
    </main>
  );
}
