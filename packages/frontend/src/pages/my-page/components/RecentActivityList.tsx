import { MatchHistoryItem, MultiMatch, SingleMatch } from '@/shared/type';

type RecentActivityListProps = {
  matchHistory: MatchHistoryItem[];
};

const getMatchConfig = (item: MatchHistoryItem) => {
  if (item.type === 'multi') {
    const match = item.match as MultiMatch;

    if (match.result === 'win') {
      return {
        icon: 'ri-sword-line',
        color: '#4ade80',
        bgColor: 'rgba(74, 222, 128, 0.1)',
        title: `Victory vs ${match.opponent.nickname}`,
        description: `+${match.tierPointChange}`,
        date: match.playedAt,
      };
    } else {
      return {
        icon: 'ri-close-circle-line',
        color: '#f87171',
        bgColor: 'rgba(248, 113, 113, 0.1)',
        title: `Defeat vs ${match.opponent.nickname}`,
        description: `${match.tierPointChange}`,
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

export function RecentActivityList({ matchHistory }: RecentActivityListProps) {
  return (
    <div className="flex h-full flex-col border-2 border-cyan-400 bg-gradient-to-br from-slate-800/90 to-slate-900/90">
      {/* Header */}
      <div className="border-b-2 border-cyan-400/30 p-3">
        <h3 className="text-sm font-bold text-cyan-400" style={{ fontFamily: 'Orbitron' }}>
          RECENT ACTIVITY
        </h3>
      </div>

      {/* Activity List */}
      <div className="scrollbar-hide flex-1 overflow-y-auto p-3">
        {matchHistory.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400" style={{ fontFamily: 'Orbitron' }}>
              No recent activity
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {matchHistory.map((item, index) => {
              const config = getMatchConfig(item);

              return (
                <div
                  key={index}
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
          </div>
        )}
      </div>
    </div>
  );
}
