// "Picked today" / "Harvested X days ago" badge text (build spec section 3).
// harvestDate is a plain `date` column (YYYY-MM-DD, no time component), so
// comparison is done on calendar days, not elapsed hours.
export function freshnessLabel(harvestDate: string | null): string | null {
  if (!harvestDate) return null;

  const harvest = new Date(`${harvestDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - harvest.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Picked today';
  if (diffDays === 1) return 'Harvested 1 day ago';
  return `Harvested ${diffDays} days ago`;
}
