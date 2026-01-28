import { getTierColor, getTierDisplayName } from './tier';

type TierBadgeProps = {
  tier: string;
  showIcon?: boolean;
  className?: string;
};

export default function TierBadge({ tier, showIcon = true, className = '' }: TierBadgeProps) {
  const { text } = getTierColor(tier);
  const displayName = getTierDisplayName(tier);

  return (
    <span className={`font-bold ${text} ${className}`} style={{ fontFamily: 'Orbitron' }}>
      {showIcon && <i className="ri-vip-crown-line mr-1" />}
      {displayName}
    </span>
  );
}
