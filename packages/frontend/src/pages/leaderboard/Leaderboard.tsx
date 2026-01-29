import { memo } from 'react';

import { useScene } from '@/feature/useScene';
import { isMultiRanking, useLeaderboard } from './hooks/useLeaderboard';
import { MultiRankingItem, SingleRankingItem } from './types';

// 티어별 색상 매핑
const getTierColor = (tier: string) => {
  const colors: Record<string, string> = {
    diamond: 'from-cyan-400 to-blue-500',
    platinum: 'from-emerald-400 to-teal-500',
    gold: 'from-amber-400 to-yellow-500',
    silver: 'from-slate-300 to-slate-400',
    bronze: 'from-orange-600 to-amber-700',
  };

  return colors[tier.toLowerCase()] || 'from-gray-400 to-gray-500';
};

// 순위 아이콘
const getRankIcon = (rank: number) => {
  if (rank === 1) {
    return '🥇';
  }

  if (rank === 2) {
    return '🥈';
  }

  if (rank === 3) {
    return '🥉';
  }

  return rank;
};

// 개별 랭킹 아이템 컴포넌트 (Memoization 적용)
const RankingItem = memo(
  ({
    item,
    rank,
    isMulti,
  }: {
    item: MultiRankingItem | SingleRankingItem;
    rank: number;
    isMulti: boolean;
  }) => {
    return (
      <div
        className={`grid grid-cols-7 items-center justify-items-center gap-4 border-b-2 border-slate-700 py-4 transition-all duration-200 hover:bg-slate-700/50 ${
          rank <= 3 ? 'bg-gradient-to-r from-amber-900/20 to-transparent' : ''
        }`}
      >
        {/* Rank */}
        <div>
          <span
            className="text-3xl font-black text-amber-400"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {getRankIcon(rank)}
          </span>
        </div>

        {/* Player */}
        <div className="col-span-2 flex items-center space-x-3 justify-self-start">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-white bg-gradient-to-br from-cyan-400 to-purple-500">
            {item.userProfile ? (
              <img
                src={item.userProfile}
                alt={item.nickname}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <i className="ri-user-star-line text-xl text-white"></i>
            )}
          </div>
          <span
            className="truncate text-base font-bold text-white"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {item.nickname}
          </span>
        </div>

        {/* Tier / Level */}
        <div className="flex items-center justify-center">
          {isMulti && isMultiRanking(item) ? (
            <span
              className={`whitespace-nowrap border-2 border-white bg-gradient-to-r px-3 py-1 text-sm font-bold text-white ${getTierColor(
                item.tier,
              )}`}
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {item.tier.toUpperCase()}
            </span>
          ) : (
            <span
              className="font-bold text-purple-400"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              LV.{(item as SingleRankingItem).level}
            </span>
          )}
        </div>

        {/* Score / Exp */}
        <div className="flex items-center justify-center">
          <span
            className="text-base font-bold text-emerald-400"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {(
              (isMulti && isMultiRanking(item)
                ? item.tierPoint
                : (item as SingleRankingItem).expPoint) ?? 0
            ).toLocaleString()}
          </span>
        </div>

        {/* Win/Lose OR Solved */}
        <div className="flex items-center justify-center">
          {isMulti && isMultiRanking(item) ? (
            <span
              className="text-sm font-bold text-white"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              <span className="text-green-400">{item.winCount}</span>
              <span className="mx-1 text-slate-400">/</span>
              <span className="text-red-400">{item.loseCount}</span>
            </span>
          ) : (
            <span
              className="text-sm font-bold text-blue-400"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {(item as SingleRankingItem).solvedCount} SOLVED
            </span>
          )}
        </div>

        {/* Rate */}
        <div className="flex items-center justify-center">
          <span
            className="text-base font-bold text-pink-400"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {isMulti && isMultiRanking(item)
              ? (() => {
                  const total = item.winCount + item.loseCount;

                  return total > 0 ? ((item.winCount / total) * 100).toFixed(1) : '0.0';
                })()
              : (() => {
                  const solved = (item as SingleRankingItem).solvedCount;
                  const correct = (item as SingleRankingItem).correctCount;

                  return solved > 0 ? ((correct / solved) * 100).toFixed(1) : '0.0';
                })()}
            %
          </span>
        </div>
      </div>
    );
  },
);

RankingItem.displayName = 'RankingItem';

export default function Leaderboard() {
  const { setScene } = useScene();
  const { currentType, data, isLoading, toggleType } = useLeaderboard();

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
        ></div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b-4 border-cyan-400 bg-gradient-to-r from-slate-800/95 to-slate-900/95 p-4">
        <div className="flex items-center justify-center">
          <button
            onClick={() => setScene('home')}
            className="border-2 border-slate-400 bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-2 font-bold text-white transition-all duration-200 hover:scale-105 hover:from-slate-500 hover:to-slate-600"
            style={{ fontFamily: 'Orbitron' }}
          >
            <i className="ri-arrow-left-line mr-2" />
            BACK
          </button>
          <h1
            className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text px-4 py-2 text-3xl font-black text-transparent"
            style={{ fontFamily: 'Orbitron' }}
          >
            <i className="ri-trophy-line mr-3" />
            LEADERBOARD
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex h-[calc(100%-100px)] flex-col px-20 py-6">
        {/* Mode Toggles */}
        <div className="mb-4 ml-1 flex gap-4">
          <button
            onClick={() => currentType !== 'multi' && toggleType()}
            className={`flex items-center border-2 px-6 py-2 transition-all duration-200 ${
              currentType === 'multi'
                ? 'scale-105 border-pink-400 bg-pink-600/80 text-white shadow-lg shadow-pink-500/50'
                : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:border-pink-400/50 hover:text-pink-300'
            }`}
            style={{ fontFamily: 'Orbitron' }}
          >
            <i className="ri-sword-line mr-2 text-xl" />
            <span className="font-bold">MULTI</span>
          </button>
          <button
            onClick={() => currentType !== 'single' && toggleType()}
            className={`flex items-center border-2 px-6 py-2 transition-all duration-200 ${
              currentType === 'single'
                ? 'scale-105 border-purple-400 bg-purple-600/80 text-white shadow-lg shadow-purple-500/50'
                : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:border-purple-400/50 hover:text-purple-300'
            }`}
            style={{ fontFamily: 'Orbitron' }}
          >
            <i className="ri-book-open-line mr-2 text-xl" />
            <span className="font-bold">SINGLE</span>
          </button>
        </div>

        <div className="flex h-full w-full flex-col overflow-hidden border-4 border-cyan-400 bg-gradient-to-r from-slate-800/90 to-slate-900/90 shadow-2xl shadow-cyan-500/30">
          {/* Scrollable List with Sticky Header */}
          <div className="scrollbar-hide flex-1 overflow-y-auto">
            {/* Table Header (Sticky) */}
            <div className="sticky top-0 z-10 grid grid-cols-7 items-center gap-4 border-b-2 border-cyan-400 bg-slate-900 py-4">
              <div
                className="text-center text-sm font-bold text-cyan-300"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                RANK
              </div>
              <div
                className="col-span-2 text-sm font-bold text-cyan-300"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                PLAYER
              </div>
              <div
                className="text-center text-sm font-bold text-cyan-300"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {currentType === 'multi' ? 'TIER' : 'LEVEL'}
              </div>
              <div
                className="text-center text-sm font-bold text-cyan-300"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {currentType === 'multi' ? 'TIER POINT' : 'EXP'}
              </div>
              <div
                className="text-center text-sm font-bold text-cyan-300"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {currentType === 'multi' ? 'W/L' : 'SOLVED'}
              </div>
              <div
                className="text-center text-sm font-bold text-cyan-300"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {currentType === 'multi' ? 'WIN RATE' : 'CORRECT RATE'}
              </div>
            </div>

            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="animate-spin text-4xl text-cyan-400">
                  <i className="ri-loader-4-line"></i>
                </div>
              </div>
            ) : data?.rankings && data.rankings.length > 0 ? (
              <div className="divide-y-2 divide-slate-700">
                {data.rankings.map((player, index) => (
                  <RankingItem
                    key={index}
                    item={player}
                    rank={player.rank}
                    isMulti={currentType === 'multi'}
                  />
                ))}
              </div>
            ) : (
              <div
                className="flex h-64 items-center justify-center text-slate-400"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                NO DATA AVAILABLE
              </div>
            )}
          </div>

          {/* Fixed My Ranking Footer */}
          {data?.myRanking && (
            <div className="z-20 border-t-4 border-cyan-400 bg-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
              <RankingItem
                item={data.myRanking}
                rank={data.myRanking.rank}
                isMulti={currentType === 'multi'}
              />
            </div>
          )}
        </div>
      </div>

      {/* Retro corner decorations */}
      <div className="absolute left-0 top-0 h-24 w-24 border-l-4 border-t-4 border-cyan-400 opacity-50"></div>
      <div className="absolute right-0 top-0 h-24 w-24 border-r-4 border-t-4 border-pink-400 opacity-50"></div>
      <div className="absolute bottom-0 left-0 h-24 w-24 border-b-4 border-l-4 border-purple-400 opacity-50"></div>
      <div className="absolute bottom-0 right-0 h-24 w-24 border-b-4 border-r-4 border-amber-400 opacity-50"></div>
    </div>
  );
}
