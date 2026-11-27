import { prisma } from "@/lib/prisma";
import { nightsBetween } from "@/lib/money";

export async function quoteStay(accommodationId: string, arrival: Date, departure: Date) {
  const nights = nightsBetween(arrival, departure);
  if (nights < 1) throw new Error("La date de départ doit être postérieure à la date d'arrivée.");
  const accommodation = await prisma.accommodation.findUnique({ where: { id: accommodationId } });
  if (!accommodation || !accommodation.active) throw new Error("Hébergement indisponible.");
  const rates = await prisma.seasonalRate.findMany({
    where: { accommodationId, startDate: { lt: departure }, endDate: { gt: arrival } },
    orderBy: { startDate: "asc" }
  });
  // Base prototype : le tarif saisonnier applicable remplace le tarif de base pour chaque nuit.
  let total = 0;
  for (let i = 0; i < nights; i++) {
    const night = new Date(arrival);
    night.setDate(arrival.getDate() + i);
    const rate = rates.find(r => r.startDate <= night && r.endDate > night);
    total += rate?.nightlyPrice ?? accommodation.basePrice;
  }
  return { nights, total, accommodation };
}
