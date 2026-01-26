import { useMyPage } from './hooks/useMyPage';
import { ProfileSection } from './components/ProfileSection';
import { StatsCard } from './components/StatsCard';
import { TierHistoryChart } from './components/TierHistoryChart';
import { RecentActivityList } from './components/RecentActivityList';

export default function MyPage() {
  const { data, isLoading, error, onClickBack } = useMyPage();

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
        {/* Header - Compact */}
        <header className="flex flex-shrink-0 items-center justify-between border-b-2 border-cyan-400 bg-slate-900/90 p-2">
          <button
            onClick={onClickBack}
            className="flex items-center gap-1 rounded border border-cyan-400 bg-cyan-400/20 px-3 py-1 text-xs font-bold text-cyan-400 transition-all duration-200 hover:scale-105 hover:bg-cyan-400/40"
            style={{ fontFamily: 'Orbitron' }}
          >
            <i className="ri-arrow-left-line" />
            <span>BACK</span>
          </button>

          <h1 className="text-xl font-bold text-cyan-400" style={{ fontFamily: 'Press Start 2P' }}>
            <i className="ri-user-line mr-2" />
            MY PAGE
          </h1>

          <div className="w-16" />
        </header>

        {/* Content - No Scroll */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="mx-auto flex h-full max-w-[1400px] flex-col gap-3">
            {isLoading && (
              <div className="text-center text-lg text-cyan-400" style={{ fontFamily: 'Orbitron' }}>
                Loading...
              </div>
            )}

            {error && (
              <div className="text-center text-lg text-red-400" style={{ fontFamily: 'Orbitron' }}>
                {error}
              </div>
            )}

            {data && (
              <>
                {/* Profile Section - Compact */}
                <div className="flex-shrink-0">
                  <ProfileSection profile={data.profile} rank={data.rank} level={data.level} />
                </div>

                {/* Main Content: Two Column Layout */}
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_500px]">
                  {/* Left Column - Profile Information */}
                  <div className="flex min-h-0 flex-col gap-3">
                    {/* Stats Cards - Compact */}
                    <div className="grid flex-shrink-0 grid-cols-1 gap-3 md:grid-cols-3">
                      <StatsCard
                        title="Problem Stats"
                        icon="ri-file-list-line"
                        borderColor="emerald-400"
                        stats={[
                          { label: 'Total Solved', value: data.problemStats.totalSolved },
                          { label: 'Correct', value: data.problemStats.correctCount },
                          {
                            label: 'Correct Rate',
                            value: `${data.problemStats.correctRate}%`,
                          },
                        ]}
                      />

                      <StatsCard
                        title="Match Stats"
                        icon="ri-sword-line"
                        borderColor="pink-400"
                        stats={[
                          { label: 'Total Matches', value: data.matchStats.totalMatches },
                          {
                            label: 'Win / Lose',
                            value: `${data.matchStats.winCount} / ${data.matchStats.loseCount}`,
                          },
                          { label: 'Win Rate', value: `${data.matchStats.winRate}%` },
                        ]}
                      />

                      <StatsCard
                        title="Ranking"
                        icon="ri-trophy-line"
                        borderColor="amber-400"
                        stats={[
                          { label: 'Current Tier', value: data.rank.tier },
                          { label: 'Tier Point', value: data.rank.tierPoint },
                          { label: 'Level', value: data.level.level },
                        ]}
                      />
                    </div>

                    {/* Tier History Chart - Flexible Height */}
                    <div className="min-h-0 flex-1">
                      <TierHistoryChart data={data.tierHistory} />
                    </div>
                  </div>

                  {/* Right Column - Recent Activity */}
                  <div className="min-h-0">
                    <RecentActivityList matchHistory={data.matchHistory} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
