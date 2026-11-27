import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function updateAccommodation(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const type = String(formData.get("type") || "ROOM") as "ROOM" | "COTTAGE";
  const capacity = Number(formData.get("capacity") || 1);
  const description = String(formData.get("description") || "").trim();
  const facilities = String(formData.get("facilities") || "").split(",").map(f => f.trim()).filter(Boolean);
  const basePrice = Math.round(Number(formData.get("basePrice") || 0) * 100);
  const sortOrder = Number(formData.get("sortOrder") || 0);
  const active = formData.get("active") === "on";
  await prisma.accommodation.update({ where: { id }, data: { name, slug, type, capacity, description, facilities, basePrice, sortOrder, active } });
  redirect("/admin/hebergements");
}

async function deleteAccommodation(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  try {
    await prisma.accommodation.delete({ where: { id } });
  } catch {
    redirect(`/admin/hebergements/${id}?error=has-bookings`);
  }
  redirect("/admin/hebergements");
}

export default async function EditAccommodation({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const stay = await prisma.accommodation.findUnique({ where: { id } });
  if (!stay) notFound();
  return (
    <main className="admin-main">
      <p className="eyebrow">HÉBERGEMENT</p>
      <h1>{stay.name}</h1>

      {error === "has-bookings" && <p className="error">Impossible de supprimer : des réservations existent pour cet hébergement. Désactivez-le plutôt.</p>}

      <section className="panel">
        <form className="form-stack" action={updateAccommodation}>
          <input type="hidden" name="id" value={stay.id} />
          <label className="field">Nom<input name="name" defaultValue={stay.name} required /></label>
          <label className="field">Slug<input name="slug" defaultValue={stay.slug} required /></label>
          <label className="field">Type
            <select name="type" defaultValue={stay.type}>
              <option value="ROOM">Chambre d'hôtes</option>
              <option value="COTTAGE">Gîte</option>
            </select>
          </label>
          <label className="field">Capacité<input type="number" name="capacity" defaultValue={stay.capacity} min="1" required /></label>
          <label className="field">Prix de base par nuit (€)<input type="number" name="basePrice" defaultValue={(stay.basePrice / 100).toFixed(2)} step="0.01" min="0" required /></label>
          <label className="field">Équipements (séparés par des virgules)<input name="facilities" defaultValue={stay.facilities.join(", ")} /></label>
          <label className="field">Description<textarea name="description" rows={4} defaultValue={stay.description} /></label>
          <label className="field">Ordre d'affichage<input type="number" name="sortOrder" defaultValue={stay.sortOrder} /></label>
          <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: "8px" }}>
            <input type="checkbox" name="active" defaultChecked={stay.active} /> Actif (visible sur le site)
          </label>
          <button className="btn">Enregistrer</button>
        </form>
        <form action={deleteAccommodation} style={{ marginTop: "16px" }}>
          <input type="hidden" name="id" value={stay.id} />
          <button className="btn" style={{ background: "#9e332b" }}>Supprimer</button>
        </form>
      </section>
    </main>
  );
}
