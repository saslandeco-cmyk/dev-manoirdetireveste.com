import { prisma } from "@/lib/prisma";
import { euros } from "@/lib/money";
import { hasOverlap } from "@/lib/availability";
import { STATUS_LABELS, STATUS_KEYS } from "@/lib/booking-status";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

async function cancelBooking(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/admin/reservations");
}

async function createBlock(formData: FormData) {
  "use server";
  const accommodationId = String(formData.get("accommodationId") || "");
  const month = String(formData.get("month") || "");
  const startDate = new Date(`${String(formData.get("startDate") || "")}T00:00:00.000Z`);
  const endDate = new Date(`${String(formData.get("endDate") || "")}T00:00:00.000Z`);
  const reason = String(formData.get("reason") || "").trim() || null;
  if (!accommodationId || isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
    redirect(`/admin/reservations?month=${month}&error=invalid-dates`);
  }
  if (await hasOverlap(accommodationId, startDate, endDate)) {
    redirect(`/admin/reservations?month=${month}&error=overlap`);
  }
  await prisma.availabilityBlock.create({ data: { accommodationId, startDate, endDate, reason } });
  revalidatePath("/admin/reservations");
  redirect(`/admin/reservations?month=${month}`);
}

async function deleteBlock(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const month = String(formData.get("month") || "");
  await prisma.availabilityBlock.delete({ where: { id } });
  revalidatePath("/admin/reservations");
  redirect(`/admin/reservations?month=${month}`);
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

type CalendarCell = { type: "booking" | "block" | "cancelled"; label: string; status?: string };

export default async function Reservations({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; month?: string; error?: string }> }) {
  const { status, q, month, error } = await searchParams;
  const statusFilter = status && STATUS_KEYS.includes(status as any) ? status : undefined;

  const { year, monthIndex } = parseMonth(month);
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 1);
  const daysInMonth = Math.round((monthEnd.getTime() - monthStart.getTime()) / 86400000);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const prevMonth = new Date(year, monthIndex - 1, 1);
  const nextMonth = new Date(year, monthIndex + 1, 1);
  const currentMonthKey = monthKey(year, monthIndex);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;

  const [bookings, accommodations, bookingsInMonth, cancelledInMonth, blocksInMonth] = await Promise.all([
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
    prisma.booking.findMany({
      where: { status: "CANCELLED", arrival: { lt: monthEnd }, departure: { gt: monthStart } },
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
  for (const b of cancelledInMonth) {
    const map = cellMap.get(b.accommodationId);
    if (!map) continue;
    const start = b.arrival < monthStart ? monthStart : b.arrival;
    const end = b.departure > monthEnd ? monthEnd : b.departure;
    for (let d = new Date(start); d < end; d = new Date(d.getTime() + 86400000)) {
      if (!map.has(d.getDate())) map.set(d.getDate(), { type: "cancelled", label: `Annulée · ${b.guest.lastName} · ${b.reference.slice(-5)}` });
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
                    const cls = cell ? (cell.type === "block" ? "blocked" : cell.type === "cancelled" ? "booked-cancelled" : `booked-${(cell.status || "").toLowerCase()}`) : "";
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
          <span className="legend-item"><i className="booked-cancelled"></i> Annulée (historique)</span>
          <span className="legend-item"><i className="blocked"></i> Bloqué manuellement</span>
        </div>
      </section>

      <section className="panel">
        <h2>Blocages manuels</h2>
        {error === "overlap" && <p className="error">Ces dates chevauchent une réservation ou un blocage existant pour cet hébergement.</p>}
        {error === "invalid-dates" && <p className="error">Dates invalides : la date de fin doit être postérieure à la date de début.</p>}
        <table className="table">
          <thead><tr><th>Hébergement</th><th>Du</th><th>Au</th><th>Motif</th><th></th></tr></thead>
          <tbody>
            {blocksInMonth.map(bl => (
              <tr key={bl.id}>
                <td>{accommodations.find(a => a.id === bl.accommodationId)?.name || "—"}</td>
                <td>{bl.startDate.toLocaleDateString("fr-FR")}</td>
                <td>{bl.endDate.toLocaleDateString("fr-FR")}</td>
                <td>{bl.reason || "—"}</td>
                <td>
                  <form action={deleteBlock}>
                    <input type="hidden" name="id" value={bl.id} />
                    <input type="hidden" name="month" value={currentMonthKey} />
                    <button className="btn">Débloquer</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!blocksInMonth.length && <p className="notice">Aucun blocage manuel ce mois-ci.</p>}
        {!!accommodations.length && (
          <form className="form-stack" action={createBlock} style={{ marginTop: "18px" }}>
            <input type="hidden" name="month" value={currentMonthKey} />
            <label className="field">Hébergement
              <select name="accommodationId" required>
                {accommodations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
            <label className="field">Du<input type="date" name="startDate" required /></label>
            <label className="field">Au<input type="date" name="endDate" required /></label>
            <label className="field">Motif (optionnel)<input name="reason" placeholder="Travaux, usage personnel…" /></label>
            <button className="btn">Bloquer cette période</button>
          </form>
        )}
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
                <td style={{ display: "flex", gap: "8px" }}>
                  <a className="btn" href={`/admin/reservations/${b.id}`}>Modifier</a>
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
