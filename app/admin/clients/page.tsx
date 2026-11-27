import { prisma } from "@/lib/prisma";
import { euros } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function Clients({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const guests = await prisma.guest.findMany({
    where: q ? {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } }
      ]
    } : undefined,
    include: { bookings: true },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  return (
    <main className="admin-main">
      <p className="eyebrow">RELATION CLIENT</p>
      <h1>Clients</h1>

      <section className="panel">
        <form style={{ display: "flex", gap: "14px", alignItems: "end", marginBottom: "20px" }}>
          <label className="field">Recherche<input name="q" defaultValue={q} placeholder="Nom, email" /></label>
          <button className="btn">Filtrer</button>
        </form>
        <table className="table">
          <thead>
            <tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Séjours</th><th>Total dépensé</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {guests.map(g => {
              const total = g.bookings.filter(b => b.status === "CONFIRMED" || b.status === "COMPLETED").reduce((sum, b) => sum + b.totalAmount, 0);
              return (
                <tr key={g.id}>
                  <td>{g.firstName} {g.lastName}</td>
                  <td>{g.email}</td>
                  <td>{g.phone || "—"}</td>
                  <td>{g.bookings.length}</td>
                  <td>{euros(total)}</td>
                  <td>{g.notes || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!guests.length && <p className="notice">Aucun client ne correspond.</p>}
      </section>
    </main>
  );
}
