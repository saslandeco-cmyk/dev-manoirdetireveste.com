import { prisma } from "@/lib/prisma";
import { euros } from "@/lib/money";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function createRate(formData: FormData) {
  "use server";
  const accommodationId = String(formData.get("accommodationId") || "");
  const startDate = new Date(String(formData.get("startDate") || ""));
  const endDate = new Date(String(formData.get("endDate") || ""));
  const nightlyPrice = Math.round(Number(formData.get("nightlyPrice") || 0) * 100);
  const minimumNights = Number(formData.get("minimumNights") || 1);
  const label = String(formData.get("label") || "").trim() || null;
  if (!accommodationId || isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) return;
  await prisma.seasonalRate.create({ data: { accommodationId, startDate, endDate, nightlyPrice, minimumNights, label } });
  revalidatePath("/admin/tarifs");
}

async function deleteRate(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.seasonalRate.delete({ where: { id } });
  revalidatePath("/admin/tarifs");
}

export default async function Tarifs() {
  const [rates, stays] = await Promise.all([
    prisma.seasonalRate.findMany({ include: { accommodation: true }, orderBy: { startDate: "asc" } }),
    prisma.accommodation.findMany({ orderBy: { sortOrder: "asc" } })
  ]);
  return (
    <main className="admin-main">
      <p className="eyebrow">TARIFICATION</p>
      <h1>Tarifs saisonniers</h1>

      <section className="panel">
        <h2>Règles actives</h2>
        <table className="table">
          <thead>
            <tr><th>Hébergement</th><th>Du</th><th>Au</th><th>Prix/nuit</th><th>Min. nuits</th><th>Libellé</th><th></th></tr>
          </thead>
          <tbody>
            {rates.map(r => (
              <tr key={r.id}>
                <td>{r.accommodation.name}</td>
                <td>{r.startDate.toLocaleDateString("fr-FR")}</td>
                <td>{r.endDate.toLocaleDateString("fr-FR")}</td>
                <td>{euros(r.nightlyPrice)}</td>
                <td>{r.minimumNights}</td>
                <td>{r.label || "—"}</td>
                <td>
                  <form action={deleteRate}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn">Supprimer</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rates.length && <p className="notice">Aucun tarif saisonnier défini : le prix de base de chaque hébergement s'applique.</p>}
      </section>

      <section className="panel">
        <h2>Ajouter un tarif</h2>
        {!stays.length && <p className="notice">Créez d'abord un hébergement avant de définir un tarif saisonnier.</p>}
        {!!stays.length && (
          <form className="form-stack" action={createRate}>
            <label className="field">Hébergement
              <select name="accommodationId" required>
                {stays.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="field">Du<input type="date" name="startDate" required /></label>
            <label className="field">Au<input type="date" name="endDate" required /></label>
            <label className="field">Prix par nuit (€)<input type="number" name="nightlyPrice" min="0" step="0.01" required /></label>
            <label className="field">Minimum de nuits<input type="number" name="minimumNights" min="1" defaultValue={1} /></label>
            <label className="field">Libellé (optionnel)<input name="label" placeholder="Haute saison" /></label>
            <button className="btn">Créer</button>
          </form>
        )}
      </section>
    </main>
  );
}
