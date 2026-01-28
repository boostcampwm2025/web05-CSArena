export type TierName = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export const TIER_COLORS: Record<TierName, { text: string; gradient: string }> = {
  bronze: {
    text: 'text-amber-700',
    gradient: 'from-amber-700 to-amber-900',
  },
  silver: {
    text: 'text-gray-300',
    gradient: 'from-gray-300 to-gray-500',
  },
  gold: {
    text: 'text-yellow-400',
    gradient: 'from-yellow-400 to-yellow-600',
  },
  platinum: {
    text: 'text-emerald-300',
    gradient: 'from-emerald-300 to-teal-500',
  },
  diamond: {
    text: 'text-cyan-400',
    gradient: 'from-cyan-400 to-blue-500',
  },
};

export function getTierColor(tier: string): { text: string; gradient: string } {
  const normalizedTier = tier.toLowerCase() as TierName;

  return TIER_COLORS[normalizedTier] || TIER_COLORS.bronze;
}

export function getTierDisplayName(tier: string): string {
  const tierMap: Record<string, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
    diamond: 'Diamond',
  };

  return tierMap[tier.toLowerCase()] || tier;
}
