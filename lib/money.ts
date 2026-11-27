export function euros(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}
export function nightsBetween(arrival: Date, departure: Date) {
  return Math.round((Date.UTC(departure.getFullYear(), departure.getMonth(), departure.getDate()) -
    Date.UTC(arrival.getFullYear(), arrival.getMonth(), arrival.getDate())) / 86400000);
}
