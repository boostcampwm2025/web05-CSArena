export function calculateTier(tierPoint: number): string {
  if (tierPoint >= 2000) {
    return 'diamond';
  }

  if (tierPoint >= 1500) {
    return 'platinum';
  }

  if (tierPoint >= 1000) {
    return 'gold';
  }

  if (tierPoint >= 500) {
    return 'silver';
  }

  return 'bronze';
}
