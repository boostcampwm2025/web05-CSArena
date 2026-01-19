import { useState } from 'react';
import { useScene } from '@/feature/useScene.tsx';
import { ProblemBankItem } from '@/shared/type';
import ProblemDetailModal from './components/ProblemDetailModal';

export default function ProblemBank() {
  const { setScene } = useScene();
  const [selectedProblem, setSelectedProblem] = useState<ProblemBankItem | null>(null);

  // Mock data for layout
  const mockStats = {
    totalSolved: 15,
    correctCount: 8,
    incorrectCount: 7,
    correctRate: 53.3,
  };

  const mockProblems: ProblemBankItem[] = [
    {
      id: 1,
      questionId: 101,
      questionContent: 'Two Sum - 배열에서 두 수의 합이 목표값이 되는 인덱스 찾기',
      categories: ['Hash Table', 'Array'],
      difficulty: 'easy',
      answerStatus: 'correct',
      isBookmarked: true,
      userAnswer:
        'Hash Map을 사용하여 O(n) 시간에 해결했습니다.\nfor (let i = 0; i < nums.length; i++) {\n  const complement = target - nums[i];\n  if (map.has(complement)) return [map.get(complement), i];\n  map.set(nums[i], i);\n}',
      correctAnswer:
        'Hash Map을 사용하여 배열을 한 번만 순회하면서 각 원소에 대해 target - nums[i]를 찾습니다.',
      aiFeedback: '완벽합니다! 시간 복잡도 O(n), 공간 복잡도 O(n)으로 최적의 해법입니다.',
      solvedAt: '2024-01-15T14:30:00.000Z',
    },
    {
      id: 2,
      questionId: 102,
      questionContent: 'Reverse Linked List - 연결 리스트를 역순으로 뒤집기',
      categories: ['Linked List', 'Recursion'],
      difficulty: 'easy',
      answerStatus: 'correct',
      isBookmarked: false,
      userAnswer:
        '반복문을 사용한 방법:\nlet prev = null;\nwhile (curr) {\n  const next = curr.next;\n  curr.next = prev;\n  prev = curr;\n  curr = next;\n}\nreturn prev;',
      correctAnswer:
        '포인터 3개(prev, curr, next)를 사용하여 각 노드의 next를 이전 노드로 바꿉니다.',
      aiFeedback: '정확한 구현입니다. 재귀 방식도 가능하지만 반복문이 더 효율적입니다.',
      solvedAt: '2024-01-15T15:45:00.000Z',
    },
    {
      id: 3,
      questionId: 103,
      questionContent: 'Binary Tree Inorder Traversal - 이진 트리의 중위 순회 구현',
      categories: ['Tree', 'DFS', 'Stack'],
      difficulty: 'medium',
      answerStatus: 'incorrect',
      isBookmarked: true,
      userAnswer:
        'function inorder(root) {\n  if (!root) return [];\n  return [...inorder(root.left), ...inorder(root.right), root.val];\n}',
      correctAnswer:
        'function inorder(root) {\n  if (!root) return [];\n  return [...inorder(root.left), root.val, ...inorder(root.right)];\n}',
      aiFeedback:
        '순서가 잘못되었습니다. 중위 순회는 왼쪽 → 루트 → 오른쪽 순서입니다. 현재 코드는 후위 순회입니다.',
      solvedAt: '2024-01-15T19:20:00.000Z',
    },
    {
      id: 4,
      questionId: 104,
      questionContent: 'Longest Substring Without Repeating - 중복 없는 가장 긴 부분 문자열 찾기',
      categories: ['String', 'Sliding Window'],
      difficulty: 'medium',
      answerStatus: 'correct',
      isBookmarked: true,
      userAnswer:
        'Sliding Window 기법 사용:\nlet max = 0, left = 0;\nconst set = new Set();\nfor (let right = 0; right < s.length; right++) {\n  while (set.has(s[right])) set.delete(s[left++]);\n  set.add(s[right]);\n  max = Math.max(max, right - left + 1);\n}\nreturn max;',
      correctAnswer: 'Sliding Window와 Set을 사용하여 중복을 제거하면서 최대 길이를 추적합니다.',
      aiFeedback:
        '훌륭합니다! Sliding Window 패턴을 정확히 이해하고 있습니다. 시간 복잡도 O(n)입니다.',
      solvedAt: '2024-01-15T11:30:00.000Z',
    },
    {
      id: 5,
      questionId: 105,
      questionContent: 'Merge K Sorted Lists - K개의 정렬된 연결 리스트 병합하기',
      categories: ['Heap', 'Divide and Conquer'],
      difficulty: 'hard',
      answerStatus: 'incorrect',
      isBookmarked: false,
      userAnswer:
        '2개씩 병합하는 방식으로 시도했습니다.\nfunction merge(l1, l2) { ... }\nlet result = lists[0];\nfor (let i = 1; i < lists.length; i++) result = merge(result, lists[i]);',
      correctAnswer:
        'Min Heap을 사용하여 각 리스트의 헤드를 비교하면서 병합하거나, Divide and Conquer로 2개씩 병합합니다.',
      aiFeedback:
        '접근 방법은 맞지만 시간 복잡도가 O(kN)입니다. Min Heap을 사용하면 O(N log k)로 개선할 수 있습니다.',
      solvedAt: '2024-01-11T02:15:00.000Z',
    },
  ];

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

      <div className="relative z-10 h-full w-full overflow-y-auto">
        <div className="mx-auto max-w-[1400px] p-4">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between rounded border-2 border-cyan-400 bg-slate-900/90 px-4 py-2 backdrop-blur-sm">
            <button
              onClick={() => setScene('home')}
              className="flex items-center gap-1 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
              style={{ fontFamily: 'Orbitron' }}
            >
              <span>←</span>
              <span>BACK</span>
            </button>

            <h1
              className="flex items-center gap-2 text-lg font-bold text-cyan-400"
              style={{ fontFamily: 'Orbitron' }}
            >
              <span>💾</span>
              <span>MY PROBLEM BANK</span>
            </h1>

            <div className="relative">
              <input
                type="text"
                placeholder="Search problems..."
                className="w-48 rounded border border-cyan-400 bg-slate-900/90 px-3 py-1 text-sm text-cyan-400 placeholder-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                style={{ fontFamily: 'Orbitron' }}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-cyan-400">
                🔍
              </span>
            </div>
          </div>

          {/* Filter Section */}
          <div className="mb-3 space-y-2 rounded border-2 border-purple-400 bg-slate-900/90 p-3 backdrop-blur-sm">
            {/* First Row */}
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded border border-cyan-400 bg-cyan-400/20 px-3 py-1 text-xs text-cyan-400 transition-colors hover:bg-cyan-400/30"
                style={{ fontFamily: 'Orbitron' }}
              >
                ALL
              </button>
              <button
                className="rounded border border-purple-400 bg-transparent px-3 py-1 text-xs text-purple-400 transition-colors hover:bg-purple-400/20"
                style={{ fontFamily: 'Orbitron' }}
              >
                ARRAY
              </button>
              <button
                className="rounded border border-purple-400 bg-transparent px-3 py-1 text-xs text-purple-400 transition-colors hover:bg-purple-400/20"
                style={{ fontFamily: 'Orbitron' }}
              >
                STRING
              </button>
            </div>

            {/* Second Row */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400" style={{ fontFamily: 'Orbitron' }}>
                  CATEGORY:
                </span>
                <button
                  className="rounded border border-purple-400 bg-transparent px-2 py-0.5 text-xs text-purple-400 transition-colors hover:bg-purple-400/20"
                  style={{ fontFamily: 'Orbitron' }}
                >
                  TREE
                </button>
                <button
                  className="rounded border border-purple-400 bg-transparent px-2 py-0.5 text-xs text-purple-400 transition-colors hover:bg-purple-400/20"
                  style={{ fontFamily: 'Orbitron' }}
                >
                  GRAPH
                </button>
                <button
                  className="rounded border border-purple-400 bg-transparent px-2 py-0.5 text-xs text-purple-400 transition-colors hover:bg-purple-400/20"
                  style={{ fontFamily: 'Orbitron' }}
                >
                  DP
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-cyan-400" style={{ fontFamily: 'Orbitron' }}>
                  DIFFICULTY:
                </span>
                <button
                  className="rounded border border-cyan-400 bg-cyan-400/20 px-2 py-0.5 text-xs text-cyan-400 transition-colors hover:bg-cyan-400/30"
                  style={{ fontFamily: 'Orbitron' }}
                >
                  ALL
                </button>
                <button
                  className="rounded border border-purple-400 bg-transparent px-2 py-0.5 text-xs text-purple-400 transition-colors hover:bg-purple-400/20"
                  style={{ fontFamily: 'Orbitron' }}
                >
                  EASY
                </button>
                <button
                  className="rounded border border-purple-400 bg-transparent px-2 py-0.5 text-xs text-purple-400 transition-colors hover:bg-purple-400/20"
                  style={{ fontFamily: 'Orbitron' }}
                >
                  MEDIUM
                </button>
                <button
                  className="rounded border border-purple-400 bg-transparent px-2 py-0.5 text-xs text-purple-400 transition-colors hover:bg-purple-400/20"
                  style={{ fontFamily: 'Orbitron' }}
                >
                  HARD
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-cyan-400" style={{ fontFamily: 'Orbitron' }}>
                  RESULT:
                </span>
                <button
                  className="rounded border border-cyan-400 bg-cyan-400/20 px-2 py-0.5 text-xs text-cyan-400 transition-colors hover:bg-cyan-400/30"
                  style={{ fontFamily: 'Orbitron' }}
                >
                  ALL
                </button>
                <button
                  className="rounded border border-purple-400 bg-transparent px-2 py-0.5 text-xs text-purple-400 transition-colors hover:bg-purple-400/20"
                  style={{ fontFamily: 'Orbitron' }}
                >
                  CORRECT
                </button>
                <button
                  className="rounded border border-purple-400 bg-transparent px-2 py-0.5 text-xs text-purple-400 transition-colors hover:bg-purple-400/20"
                  style={{ fontFamily: 'Orbitron' }}
                >
                  INCORRECT
                </button>
              </div>
            </div>

            {/* Third Row */}
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded border border-purple-400 bg-transparent px-3 py-1 text-xs text-purple-400 transition-colors hover:bg-purple-400/20"
                style={{ fontFamily: 'Orbitron' }}
              >
                SORTING
              </button>
              <button
                className="rounded border border-purple-400 bg-transparent px-3 py-1 text-xs text-purple-400 transition-colors hover:bg-purple-400/20"
                style={{ fontFamily: 'Orbitron' }}
              >
                SEARCHING
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="mb-3 grid grid-cols-4 gap-3">
            <div className="rounded border-2 border-cyan-400 bg-slate-900/90 p-3 backdrop-blur-sm">
              <div className="text-xs text-cyan-400" style={{ fontFamily: 'Orbitron' }}>
                TOTAL SOLVED
              </div>
              <div
                className="mt-1 text-2xl font-bold text-white"
                style={{ fontFamily: '"Press Start 2P"' }}
              >
                {mockStats.totalSolved}
              </div>
            </div>

            <div className="rounded border-2 border-cyan-400 bg-slate-900/90 p-3 backdrop-blur-sm">
              <div className="text-xs text-cyan-400" style={{ fontFamily: 'Orbitron' }}>
                CORRECT
              </div>
              <div
                className="mt-1 text-2xl font-bold text-white"
                style={{ fontFamily: '"Press Start 2P"' }}
              >
                {mockStats.correctCount}
              </div>
            </div>

            <div className="rounded border-2 border-pink-400 bg-slate-900/90 p-3 backdrop-blur-sm">
              <div className="text-xs text-pink-400" style={{ fontFamily: 'Orbitron' }}>
                INCORRECT
              </div>
              <div
                className="mt-1 text-2xl font-bold text-white"
                style={{ fontFamily: '"Press Start 2P"' }}
              >
                {mockStats.incorrectCount}
              </div>
            </div>

            <div className="rounded border-2 border-cyan-400 bg-slate-900/90 p-3 backdrop-blur-sm">
              <div className="text-xs text-cyan-400" style={{ fontFamily: 'Orbitron' }}>
                CORRECT RATE
              </div>
              <div
                className="mt-1 text-2xl font-bold text-white"
                style={{ fontFamily: '"Press Start 2P"' }}
              >
                {mockStats.correctRate}%
              </div>
            </div>
          </div>

          {/* Problem Table */}
          <div className="rounded border-2 border-cyan-400 bg-slate-900/90 backdrop-blur-sm">
            {/* Table Header */}
            <div
              className="grid grid-cols-12 gap-4 border-b border-cyan-400/30 px-4 py-2 text-xs text-cyan-400"
              style={{ fontFamily: 'Orbitron' }}
            >
              <div className="col-span-1">RESULT</div>
              <div className="col-span-5">TITLE</div>
              <div className="col-span-3">TAGS</div>
              <div className="col-span-1">DIFFICULTY</div>
              <div className="col-span-2">SOLVED AT</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-cyan-400/10">
              {mockProblems.map((problem) => (
                <div
                  key={problem.id}
                  onClick={() => setSelectedProblem(problem)}
                  className="grid cursor-pointer grid-cols-12 gap-4 px-4 py-3 transition-colors hover:bg-purple-900/20"
                >
                  {/* Result */}
                  <div className="col-span-1 flex items-center">
                    {problem.answerStatus === 'correct' ? (
                      <span className="text-xl text-green-400">✓</span>
                    ) : problem.answerStatus === 'incorrect' ? (
                      <span className="text-xl text-red-400">✗</span>
                    ) : (
                      <span className="text-xl text-yellow-400">◐</span>
                    )}
                  </div>

                  {/* Title */}
                  <div className="col-span-5 flex items-center text-sm text-white">
                    {problem.questionContent}
                  </div>

                  {/* Tags */}
                  <div className="col-span-3 flex flex-wrap items-center gap-1">
                    {problem.categories.map((tag, idx) => (
                      <span
                        key={idx}
                        className="rounded border border-cyan-400 bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-400"
                        style={{ fontFamily: 'Orbitron' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Difficulty */}
                  <div className="col-span-1 flex items-center">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        problem.difficulty === 'easy'
                          ? 'bg-green-500/20 text-green-400'
                          : problem.difficulty === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                      }`}
                      style={{ fontFamily: 'Orbitron' }}
                    >
                      {problem.difficulty.toUpperCase()}
                    </span>
                  </div>

                  {/* Solved At */}
                  <div
                    className="col-span-2 flex items-center text-xs text-gray-400"
                    style={{ fontFamily: 'Orbitron' }}
                  >
                    {new Date(problem.solvedAt).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-3 flex justify-center gap-2">
            {[1, 2, 3].map((page) => (
              <button
                key={page}
                className={`h-8 w-8 rounded border ${
                  page === 1
                    ? 'border-cyan-400 bg-cyan-400/20 text-cyan-400'
                    : 'border-purple-400 bg-transparent text-purple-400 hover:bg-purple-400/20'
                } text-sm transition-colors`}
                style={{ fontFamily: 'Orbitron' }}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Problem Detail Modal */}
      <ProblemDetailModal problem={selectedProblem} onClose={() => setSelectedProblem(null)} />
    </div>
  );
}
