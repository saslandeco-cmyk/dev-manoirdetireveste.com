import { prisma } from "@/lib/prisma";
import { euros } from "@/lib/money";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

async function createAddOn(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const price = Math.round(Number(formData.get("price") || 0) * 100);
  const unit = String(formData.get("unit") || "PER_STAY");
  if (!name) return;
  await prisma.addOn.create({ data: { name, description, price, unit } });
  revalidatePath("/admin/configuration");
}

async function toggleAddOn(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await prisma.addOn.update({ where: { id }, data: { active: !active } });
  revalidatePath("/admin/configuration");
}

async function createAdminUser(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "STAFF") as "ADMIN" | "MANAGER" | "STAFF";
  if (!email || password.length < 8) return;
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.create({ data: { email, passwordHash, role } });
  revalidatePath("/admin/configuration");
}

async function toggleAdminUser(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await prisma.adminUser.update({ where: { id }, data: { active: !active } });
  revalidatePath("/admin/configuration");
}

export default async function Configuration() {
  const [addOns, admins] = await Promise.all([
    prisma.addOn.findMany({ orderBy: { name: "asc" } }),
    prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } })
  ]);
  return (
    <main className="admin-main">
      <p className="eyebrow">PARAMÈTRES</p>
      <h1>Configuration</h1>

      <section className="panel">
        <h2>Prestations complémentaires</h2>
        <table className="table">
          <thead><tr><th>Nom</th><th>Prix</th><th>Unité</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {addOns.map(a => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{euros(a.price)}</td>
                <td>{a.unit}</td>
                <td>{a.active ? "Actif" : "Inactif"}</td>
                <td>
                  <form action={toggleAddOn}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="active" value={String(a.active)} />
                    <button className="btn">{a.active ? "Désactiver" : "Activer"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!addOns.length && <p className="notice">Aucune prestation complémentaire.</p>}
        <form className="form-stack" action={createAddOn} style={{ marginTop: "18px" }}>
          <label className="field">Nom<input name="name" required /></label>
          <label className="field">Description<input name="description" /></label>
          <label className="field">Prix (€)<input type="number" name="price" min="0" step="0.01" required /></label>
          <label className="field">Unité
            <select name="unit">
              <option value="PER_STAY">Par séjour</option>
              <option value="PER_NIGHT">Par nuit</option>
              <option value="PER_PERSON">Par personne</option>
            </select>
          </label>
          <button className="btn">Ajouter</button>
        </form>
      </section>

      <section className="panel">
        <h2>Comptes administrateurs</h2>
        <table className="table">
          <thead><tr><th>Email</th><th>Rôle</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id}>
                <td>{a.email}</td>
                <td>{a.role}</td>
                <td>{a.active ? "Actif" : "Inactif"}</td>
                <td>
                  <form action={toggleAdminUser}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="active" value={String(a.active)} />
                    <button className="btn">{a.active ? "Désactiver" : "Activer"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="notice">Le compte défini par les variables d'environnement ADMIN_EMAIL / ADMIN_PASSWORD_HASH reste actif en plus des comptes créés ici.</p>
        <form className="form-stack" action={createAdminUser} style={{ marginTop: "18px" }}>
          <label className="field">Email<input type="email" name="email" required /></label>
          <label className="field">Mot de passe (8 caractères min.)<input type="password" name="password" minLength={8} required /></label>
          <label className="field">Rôle
            <select name="role">
              <option value="STAFF">Personnel</option>
              <option value="MANAGER">Gestionnaire</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </label>
          <button className="btn">Créer le compte</button>
        </form>
      </section>
    </main>
  );
}
