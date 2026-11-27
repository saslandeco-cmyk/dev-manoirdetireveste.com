import { prisma } from "@/lib/prisma";

export async function hasOverlap(accommodationId: string, start: Date, end: Date, excludeBookingId?: string) {
  const [conflictingBooking, conflictingBlock] = await Promise.all([
    prisma.booking.findFirst({
      where: {
        accommodationId,
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        arrival: { lt: end },
        departure: { gt: start },
        OR: [{ status: "CONFIRMED" }, { status: "COMPLETED" }, { status: "PENDING_PAYMENT", expiresAt: { gt: new Date() } }]
      }
    }),
    prisma.availabilityBlock.findFirst({
      where: { accommodationId, startDate: { lt: end }, endDate: { gt: start } }
    })
  ]);
  return Boolean(conflictingBooking || conflictingBlock);
}
