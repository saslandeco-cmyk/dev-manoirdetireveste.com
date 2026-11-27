import { prisma } from "@/lib/prisma";
import { euros } from "@/lib/money";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "En attente de paiement",
  CONFIRMED: "Confirmée",
  CANCELLED: "Annulée",
  EXPIRED: "Expirée",
  COMPLETED: "Terminée"
};
const STATUS_KEYS = Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[];
const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

async function cancelBooking(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/admin/reservations");
}

function parseMonth(raw?: string) {
  const now = new Date();
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    return { year: y, monthIndex: m - 1 };
  }
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

function monthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

type CalendarCell = { type: "booking" | "block"; label: string; status?: string };

export default async function Reservations({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; month?: string }> }) {
  const { status, q, month } = await searchParams;
  const statusFilter = status && STATUS_KEYS.includes(status as any) ? status : undefined;

  const { year, monthIndex } = parseMonth(month);
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 1);
  const daysInMonth = Math.round((monthEnd.getTime() - monthStart.getTime()) / 86400000);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const prevMonth = new Date(year, monthIndex - 1, 1);
  const nextMonth = new Date(year, monthIndex + 1, 1);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;

  const [bookings, accommodations, bookingsInMonth, blocksInMonth] = await Promise.all([
    prisma.booking.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter as any } : {}),
        ...(q ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { guest: { email: { contains: q, mode: "insensitive" } } },
            { guest: { lastName: { contains: q, mode: "insensitive" } } }
          ]
        } : {})
      },
      include: { guest: true, accommodation: true },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.accommodation.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.booking.findMany({
      where: { status: { in: ["CONFIRMED", "PENDING_PAYMENT", "COMPLETED"] }, arrival: { lt: monthEnd }, departure: { gt: monthStart } },
      include: { guest: true }
    }),
    prisma.availabilityBlock.findMany({ where: { startDate: { lt: monthEnd }, endDate: { gt: monthStart } } })
  ]);

  const cellMap = new Map<string, Map<number, CalendarCell>>();
  for (const acc of accommodations) cellMap.set(acc.id, new Map());
  for (const b of bookingsInMonth) {
    const map = cellMap.get(b.accommodationId);
    if (!map) continue;
    const start = b.arrival < monthStart ? monthStart : b.arrival;
    const end = b.departure > monthEnd ? monthEnd : b.departure;
    for (let d = new Date(start); d < end; d = new Date(d.getTime() + 86400000)) {
      map.set(d.getDate(), { type: "booking", label: `${b.guest.lastName} · ${b.reference.slice(-5)}`, status: b.status });
    }
  }
  for (const bl of blocksInMonth) {
    const map = cellMap.get(bl.accommodationId);
    if (!map) continue;
    const start = bl.startDate < monthStart ? monthStart : bl.startDate;
    const end = bl.endDate > monthEnd ? monthEnd : bl.endDate;
    for (let d = new Date(start); d < end; d = new Date(d.getTime() + 86400000)) {
      if (!map.has(d.getDate())) map.set(d.getDate(), { type: "block", label: bl.reason || "Bloqué" });
    }
  }

  return (
    <main className="admin-main">
      <p className="eyebrow">PLANNING COMMERCIAL</p>
      <h1>Réservations</h1>

      <section className="panel">
        <h2 style={{ textTransform: "capitalize" }}>Calendrier · {MONTH_LABEL.format(monthStart)}</h2>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "14px" }}>
          <a className="btn" href={`/admin/reservations?month=${monthKey(prevMonth.getFullYear(), prevMonth.getMonth())}`}>← Mois précédent</a>
          {!isCurrentMonth && <a className="btn" href="/admin/reservations">Aujourd'hui</a>}
          <a className="btn" href={`/admin/reservations?month=${monthKey(nextMonth.getFullYear(), nextMonth.getMonth())}`}>Mois suivant →</a>
        </div>
        <div className="calendar-wrap">
          <table className="calendar">
            <thead>
              <tr>
                <th className="acc-name">Hébergement</th>
                {days.map(d => <th key={d} className={[0, 6].includes(new Date(year, monthIndex, d).getDay()) ? "weekend" : ""}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {accommodations.map(acc => (
                <tr key={acc.id}>
                  <td className="acc-name">{acc.name}</td>
                  {days.map(d => {
                    const cell = cellMap.get(acc.id)?.get(d);
                    const cls = cell ? (cell.type === "block" ? "blocked" : `booked-${(cell.status || "").toLowerCase()}`) : "";
                    return <td key={d} className={cls} title={cell?.label || "Libre"}></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!accommodations.length && <p className="notice">Créez un hébergement pour afficher le calendrier.</p>}
        <div className="legend">
          <span className="legend-item"><i className="booked-confirmed"></i> Confirmée</span>
          <span className="legend-item"><i className="booked-pending_payment"></i> En attente de paiement</span>
          <span className="legend-item"><i className="booked-completed"></i> Terminée</span>
          <span className="legend-item"><i className="blocked"></i> Bloqué manuellement</span>
        </div>
      </section>

      <section className="panel">
        <h2>Liste des réservations</h2>
        <form style={{ display: "flex", gap: "14px", alignItems: "end", flexWrap: "wrap", marginBottom: "20px" }}>
          <label className="field">Recherche<input name="q" defaultValue={q} placeholder="Référence, nom, email" /></label>
          <label className="field">Statut
            <select name="status" defaultValue={statusFilter || ""}>
              <option value="">Tous</option>
              {STATUS_KEYS.map(k => <option key={k} value={k}>{STATUS_LABELS[k]}</option>)}
            </select>
          </label>
          <button className="btn">Filtrer</button>
        </form>
        <table className="table">
          <thead>
            <tr><th>Référence</th><th>Client</th><th>Hébergement</th><th>Arrivée</th><th>Départ</th><th>Statut</th><th>Paiement</th><th>Total</th><th></th></tr>
          </thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.id}>
                <td>{b.reference}</td>
                <td>{b.guest.firstName} {b.guest.lastName}<br /><span className="muted">{b.guest.email}</span></td>
                <td>{b.accommodation.name}</td>
                <td>{b.arrival.toLocaleDateString("fr-FR")}</td>
                <td>{b.departure.toLocaleDateString("fr-FR")}</td>
                <td>{STATUS_LABELS[b.status] ?? b.status}</td>
                <td>{b.paymentStatus}</td>
                <td>{euros(b.totalAmount)}</td>
                <td>
                  {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                    <form action={cancelBooking}>
                      <input type="hidden" name="id" value={b.id} />
                      <button className="btn">Annuler</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!bookings.length && <p className="notice">Aucune réservation ne correspond.</p>}
      </section>
    </main>
  );
}
