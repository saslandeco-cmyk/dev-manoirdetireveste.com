import { prisma } from "@/lib/prisma";
import { euros } from "@/lib/money";
import { hasOverlap } from "@/lib/availability";
import { STATUS_LABELS } from "@/lib/booking-status";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function updateDates(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const arrival = new Date(`${String(formData.get("arrival") || "")}T00:00:00.000Z`);
  const departure = new Date(`${String(formData.get("departure") || "")}T00:00:00.000Z`);
  if (isNaN(arrival.getTime()) || isNaN(departure.getTime()) || departure <= arrival) {
    redirect(`/admin/reservations/${id}?error=invalid-dates`);
  }
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) notFound();
  if (await hasOverlap(booking.accommodationId, arrival, departure, id)) {
    redirect(`/admin/reservations/${id}?error=overlap`);
  }
  await prisma.booking.update({ where: { id }, data: { arrival, departure } });
  redirect(`/admin/reservations/${id}?success=1`);
}

async function cancelBooking(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
  redirect(`/admin/reservations/${id}?success=1`);
}

export default async function EditBooking({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const { error, success } = await searchParams;
  const booking = await prisma.booking.findUnique({ where: { id }, include: { guest: true, accommodation: true } });
  if (!booking) notFound();

  return (
    <main className="admin-main">
      <p className="eyebrow">RÉSERVATION {booking.reference}</p>
      <h1>{booking.guest.firstName} {booking.guest.lastName}</h1>

      <section className="panel">
        <p className="muted">{booking.accommodation.name} · {STATUS_LABELS[booking.status] ?? booking.status} · {euros(booking.totalAmount)}</p>

        {success && <p className="success">Modifications enregistrées.</p>}
        {error === "overlap" && <p className="error">Ces dates chevauchent une autre réservation ou un blocage pour cet hébergement.</p>}
        {error === "invalid-dates" && <p className="error">Dates invalides : la date de départ doit être postérieure à l'arrivée.</p>}

        <form className="form-stack" action={updateDates}>
          <input type="hidden" name="id" value={booking.id} />
          <label className="field">Arrivée<input type="date" name="arrival" defaultValue={booking.arrival.toISOString().slice(0, 10)} required /></label>
          <label className="field">Départ<input type="date" name="departure" defaultValue={booking.departure.toISOString().slice(0, 10)} required /></label>
          <button className="btn">Enregistrer les nouvelles dates</button>
        </form>

        {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
          <form action={cancelBooking} style={{ marginTop: "16px" }}>
            <input type="hidden" name="id" value={booking.id} />
            <button className="btn" style={{ background: "#9e332b" }}>Annuler la réservation</button>
          </form>
        )}

        <p style={{ marginTop: "22px" }}><a href="/admin/reservations">← Retour aux réservations</a></p>
      </section>
    </main>
  );
}
