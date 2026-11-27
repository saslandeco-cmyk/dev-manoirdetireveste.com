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

async function cancelBooking(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/admin/reservations");
}

export default async function Reservations({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  const statusFilter = status && STATUS_KEYS.includes(status as any) ? status : undefined;
  const bookings = await prisma.booking.findMany({
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
  });
  return (
    <main className="admin-main">
      <p className="eyebrow">PLANNING COMMERCIAL</p>
      <h1>Réservations</h1>

      <section className="panel">
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
