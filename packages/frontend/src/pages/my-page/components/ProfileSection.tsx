import { UserLevel, UserProfile, UserRank } from '@/shared/type';
import ProfileAvatar from '@/shared/ProfileAvatar';
import TierBadge from '@/shared/TierBadge';

type ProfileSectionProps = {
  profile: UserProfile;
  rank: UserRank;
  level: UserLevel;
};

export function ProfileSection({ profile, rank, level }: ProfileSectionProps) {
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <div className="flex h-full items-center gap-4 border-2 border-cyan-400 bg-gradient-to-r from-slate-800/90 to-slate-900/90 p-3">
      {/* User Info */}
      <div className="flex gap-3">
        <ProfileAvatar profileImage={profile.profileImage} nickname={profile.nickname} size="md" />
        <div className="flex flex-col justify-center gap-1">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-bold text-cyan-300" style={{ fontFamily: 'Orbitron' }}>
              {profile.nickname}
            </h2>
            <span className="text-sm font-bold text-pink-400" style={{ fontFamily: 'Orbitron' }}>
              LV.{level.level}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <TierBadge tier={rank.tier} className="text-sm" />
            <span className="text-sm font-bold text-yellow-300" style={{ fontFamily: 'Orbitron' }}>
              ⭐ {rank.tierPoint.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Member Since */}
      <div
        className="ml-auto text-xs text-cyan-400"
        style={{ fontFamily: 'Orbitron', whiteSpace: 'nowrap' }}
      >
        Member Since
        <br />
        {memberSince}
      </div>

      {/* Experience Bar */}
      <div className="flex w-full max-w-[520px] flex-col gap-1 sm:w-96 lg:w-[520px]">
        <div
          className="flex justify-between text-sm text-cyan-300"
          style={{ fontFamily: 'Orbitron' }}
        >
          <span className="font-bold">EXP TO NEXT LEVEL</span>
          <span>
            {level.remainedExpPoint} / {level.needExpPoint}
          </span>
        </div>

        <div className="relative h-4 w-full overflow-hidden border border-cyan-500 bg-slate-700">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-500"
            style={{ width: `${Math.round((level.remainedExpPoint / level.needExpPoint) * 100)}%` }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white"
            style={{ fontFamily: 'Orbitron' }}
          >
            {Math.round((level.remainedExpPoint / level.needExpPoint) * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}
