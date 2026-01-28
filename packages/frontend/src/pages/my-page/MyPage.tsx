import { useMyPage } from './hooks/useMyPage';
import { ProfileSection } from './components/ProfileSection';
import { StatsCard } from './components/StatsCard';
import { TierHistoryChart } from './components/TierHistoryChart';
import { RecentActivityList } from './components/RecentActivityList';

export default function MyPage() {
  const { profileData, tierHistoryData, matchHistoryData, isLoading, onClickBack } = useMyPage();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Retro grid background */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        {/* Header */}
        <header className="relative z-10 flex flex-shrink-0 items-center justify-between border-b-4 border-cyan-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-4">
          <div className="flex items-center justify-center">
            <button
              onClick={onClickBack}
              className="border-2 border-slate-400 bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-2 font-bold text-white transition-all duration-200 hover:scale-105 hover:from-slate-500 hover:to-slate-600"
              style={{ fontFamily: 'Orbitron' }}
            >
              <i className="ri-arrow-left-line mr-2" />
              BACK
            </button>
            <h1
              className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text px-4 py-2 text-3xl font-black text-transparent"
              style={{ fontFamily: 'Orbitron' }}
            >
              <i className="ri-user-line mr-3" />
              MY PAGE
            </h1>
          </div>
        </header>

        {/* Content - No Scroll */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="mx-auto flex h-full max-w-[1400px] flex-col gap-3">
            {isLoading && (
              <div className="text-center text-lg text-cyan-400" style={{ fontFamily: 'Orbitron' }}>
                Loading...
              </div>
            )}

            {profileData && (
              <>
                {/* Profile Section - Compact */}
                <div className="min-h-0 flex-[0.175]">
                  <ProfileSection
                    profile={profileData.profile}
                    rank={profileData.rank}
                    level={profileData.level}
                  />
                </div>

                {/* Main Content: Two Column Layout */}
                <div className="grid min-h-0 flex-[0.825] grid-cols-1 gap-4 lg:grid-cols-[1fr_500px]">
                  {/* Left Column - Profile Information */}
                  <div className="flex min-h-0 flex-col gap-3">
                    {/* Stats Cards - Compact */}
                    <div className="grid flex-shrink-0 grid-cols-1 gap-3 md:grid-cols-3">
                      <StatsCard
                        title="Problem Stats"
                        icon="ri-file-list-line"
                        borderColor="emerald-400"
                        stats={[
                          { label: 'Total Solved', value: profileData.problemStats.totalSolved },
                          { label: 'Correct', value: profileData.problemStats.correctCount },
                          {
                            label: 'Correct Rate',
                            value: `${profileData.problemStats.correctRate}%`,
                          },
                        ]}
                      />

                      <StatsCard
                        title="Match Stats"
                        icon="ri-sword-line"
                        borderColor="pink-400"
                        stats={[
                          { label: 'Total Matches', value: profileData.matchStats.totalMatches },
                          {
                            label: 'Win / Draw / Lose',
                            value: `${profileData.matchStats.winCount}/ ${profileData.matchStats.drawCount} / ${profileData.matchStats.loseCount}`,
                          },
                          { label: 'Win Rate', value: `${profileData.matchStats.winRate}%` },
                        ]}
                      />

                      <StatsCard
                        title="Ranking"
                        icon="ri-trophy-line"
                        borderColor="amber-400"
                        stats={[
                          { label: 'Current Tier', value: profileData.rank.tier },
                          { label: 'Tier Point', value: profileData.rank.tierPoint },
                          { label: 'Level', value: profileData.level.level },
                        ]}
                      />
                    </div>

                    {/* Tier History Chart - Flexible Height */}
                    {tierHistoryData && (
                      <div className="min-h-0 flex-1">
                        <TierHistoryChart data={tierHistoryData.tierHistory} />
                      </div>
                    )}
                  </div>

                  {/* Right Column - Recent Activity */}
                  {matchHistoryData && (
                    <div className="min-h-0">
                      <RecentActivityList matchHistory={matchHistoryData.matchHistory} />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
