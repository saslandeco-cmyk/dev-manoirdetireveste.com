import { prisma } from "@/lib/prisma";
import { euros } from "@/lib/money";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function createAccommodation(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const type = String(formData.get("type") || "ROOM") as "ROOM" | "COTTAGE";
  const capacity = Number(formData.get("capacity") || 1);
  const description = String(formData.get("description") || "").trim();
  const facilities = String(formData.get("facilities") || "").split(",").map(f => f.trim()).filter(Boolean);
  const basePrice = Math.round(Number(formData.get("basePrice") || 0) * 100);
  const sortOrder = Number(formData.get("sortOrder") || 0);
  if (!name || !slug) return;
  await prisma.accommodation.create({ data: { name, slug, type, capacity, description, facilities, basePrice, sortOrder } });
  revalidatePath("/admin/hebergements");
}

async function toggleActive(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await prisma.accommodation.update({ where: { id }, data: { active: !active } });
  revalidatePath("/admin/hebergements");
}

export default async function Hebergements() {
  const stays = await prisma.accommodation.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <main className="admin-main">
      <p className="eyebrow">CATALOGUE</p>
      <h1>Hébergements</h1>

      <section className="panel">
        <h2>Liste</h2>
        <table className="table">
          <thead>
            <tr><th>Nom</th><th>Type</th><th>Capacité</th><th>Prix de base</th><th>Statut</th><th>Ordre</th><th></th></tr>
          </thead>
          <tbody>
            {stays.map(s => (
              <tr key={s.id}>
                <td><a href={`/admin/hebergements/${s.id}`}>{s.name}</a></td>
                <td>{s.type === "ROOM" ? "Chambre d'hôtes" : "Gîte"}</td>
                <td>{s.capacity}</td>
                <td>{euros(s.basePrice)}</td>
                <td>{s.active ? "Actif" : "Inactif"}</td>
                <td>{s.sortOrder}</td>
                <td>
                  <form action={toggleActive}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="active" value={String(s.active)} />
                    <button className="btn">{s.active ? "Désactiver" : "Activer"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!stays.length && <p className="notice">Aucun hébergement pour l'instant.</p>}
      </section>

      <section className="panel">
        <h2>Ajouter un hébergement</h2>
        <form className="form-stack" action={createAccommodation}>
          <label className="field">Nom<input name="name" required /></label>
          <label className="field">Slug (URL)<input name="slug" placeholder="chambre-chene" required /></label>
          <label className="field">Type
            <select name="type">
              <option value="ROOM">Chambre d'hôtes</option>
              <option value="COTTAGE">Gîte</option>
            </select>
          </label>
          <label className="field">Capacité<input type="number" name="capacity" min="1" defaultValue={2} required /></label>
          <label className="field">Prix de base par nuit (€)<input type="number" name="basePrice" min="0" step="0.01" required /></label>
          <label className="field">Équipements (séparés par des virgules)<input name="facilities" placeholder="Wifi, Parking, Piscine" /></label>
          <label className="field">Description<textarea name="description" rows={4} /></label>
          <label className="field">Ordre d'affichage<input type="number" name="sortOrder" defaultValue={0} /></label>
          <button className="btn">Créer</button>
        </form>
      </section>
    </main>
  );
}
