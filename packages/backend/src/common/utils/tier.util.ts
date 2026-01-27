export function calculateTier(tierPoint: number): string {
  if (tierPoint >= 2500) {
    return 'diamond';
  }

  if (tierPoint >= 2000) {
    return 'platinum';
  }

  if (tierPoint >= 1500) {
    return 'gold';
  }

  if (tierPoint >= 1000) {
    return 'silver';
  }

  return 'bronze';
}
