import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useInfiniteMatchHistory } from '../hooks/useInfiniteMatchHistory';
import { MatchHistoryItem, MultiMatch, SingleMatch } from '@/shared/type';

const getMatchConfig = (item: MatchHistoryItem) => {
  if (item.type === 'multi') {
    const match = item.match as MultiMatch;

    const isWin = match.result === 'win';
    const scoreDisplay = `${match.myScore} : ${match.opponentScore}`;
    const pointDisplay =
      match.tierPointChange > 0 ? `+${match.tierPointChange}` : `${match.tierPointChange}`;

    if (isWin) {
      return {
        icon: 'ri-sword-line',
        color: '#4ade80',
        bgColor: 'rgba(74, 222, 128, 0.1)',
        title: `Victory vs ${match.opponent.nickname}`,
        description: `Score ${scoreDisplay} (${pointDisplay} RP)`,
        date: match.playedAt,
      };
    } else if (match.result === 'draw') {
      return {
        icon: 'ri-subtract-line',
        color: '#facc15',
        bgColor: 'rgba(250, 204, 21, 0.1)',
        title: `Draw vs ${match.opponent.nickname}`,
        description: `Score ${scoreDisplay} (${pointDisplay} RP)`,
        date: match.playedAt,
      };
    } else {
      return {
        icon: 'ri-close-circle-line',
        color: '#f87171',
        bgColor: 'rgba(248, 113, 113, 0.1)',
        title: `Defeat vs ${match.opponent.nickname}`,
        description: `Score ${scoreDisplay} (${pointDisplay} RP)`,
        date: match.playedAt,
      };
    }
  } else {
    const match = item.match as SingleMatch;

    return {
      icon: 'ri-book-open-line',
      color: '#a78bfa',
      bgColor: 'rgba(167, 139, 250, 0.1)',
      title: `Self Study - ${match.category.name}`,
      description: `+${match.expGained} EXP`,
      date: match.playedAt,
    };
  }
};

export function RecentActivityList() {
  const [activeTab, setActiveTab] = useState<'all' | 'multi' | 'single'>('all');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteMatchHistory(activeTab);

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allMatches = data?.pages.flatMap((page) => page.matchHistory) ?? [];

  return (
    <div className="flex h-full flex-col border-2 border-cyan-400 bg-gradient-to-br from-slate-800/90 to-slate-900/90">
      {/* Header with Tabs */}
      <div className="border-b-2 border-cyan-400/30">
        <div className="flex">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
              activeTab === 'all'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-cyan-300'
            }`}
            style={{ fontFamily: 'Orbitron' }}
          >
            ALL
          </button>
          <button
            onClick={() => setActiveTab('multi')}
            className={`flex-1 border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
              activeTab === 'multi'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-cyan-300'
            }`}
            style={{ fontFamily: 'Orbitron' }}
          >
            RANKED
          </button>
          <button
            onClick={() => setActiveTab('single')}
            className={`flex-1 border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
              activeTab === 'single'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-cyan-300'
            }`}
            style={{ fontFamily: 'Orbitron' }}
          >
            PRACTICE
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="scrollbar-hide flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-cyan-400" style={{ fontFamily: 'Orbitron' }}>
              Loading...
            </p>
          </div>
        ) : allMatches.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400" style={{ fontFamily: 'Orbitron' }}>
              No recent activity
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {allMatches.map((item) => {
              const config = getMatchConfig(item);

              return (
                <div
                  key={item.match.id}
                  className="flex gap-3 border p-2 transition-all duration-200 hover:scale-[1.01]"
                  style={{
                    borderColor: config.color,
                    backgroundColor: config.bgColor,
                  }}
                >
                  {/* Icon */}
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded border"
                    style={{
                      borderColor: config.color,
                      backgroundColor: `${config.bgColor}cc`,
                    }}
                  >
                    <i className={`${config.icon} text-lg`} style={{ color: config.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h4
                      className="truncate text-sm font-bold text-white"
                      style={{ fontFamily: 'Orbitron' }}
                    >
                      {config.title}
                    </h4>
                    <p
                      className="truncate text-xs text-cyan-300"
                      style={{ fontFamily: 'Orbitron' }}
                    >
                      {config.description}
                    </p>
                  </div>

                  <div
                    className="flex-shrink-0 text-[10px] text-cyan-400"
                    style={{ fontFamily: 'Orbitron' }}
                  >
                    {new Date(config.date).toLocaleDateString('ko-KR', {
                      timeZone: 'Asia/Seoul',
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </div>
                </div>
              );
            })}

            {/* Infinite scroll trigger */}
            {hasNextPage && (
              <div ref={ref} className="py-4 text-center">
                {isFetchingNextPage ? (
                  <div className="text-sm text-cyan-400" style={{ fontFamily: 'Orbitron' }}>
                    Loading more...
                  </div>
                ) : (
                  <div className="text-xs text-gray-500" style={{ fontFamily: 'Orbitron' }}>
                    Scroll for more
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
