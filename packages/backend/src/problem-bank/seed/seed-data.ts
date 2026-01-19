export interface SeedProblemBankItem {
  // User, Question, Match는 이미 존재한다고 가정
  // userId: DB에 존재하는 User ID를 사용
  // questionId: Quiz Seed에서 생성된 Question ID 사용 (1~N)
  // matchId: 생성할 Match ID
  userAnswer: string;
  answerStatus: 'correct' | 'incorrect' | 'partial';
  isBookmarked: boolean;
  aiFeedback: string;
}

// 테스트 시나리오: User ID 1이 15개 문제를 품
// - 8개 정답 (correct rate: 53.3%)
// - 6개 오답
// - 1개 부분 정답
export const SEED_PROBLEM_BANK_ITEMS: SeedProblemBankItem[] = [
  // ===== 정답 8개 =====
  {
    userAnswer: 'A',
    answerStatus: 'correct',
    isBookmarked: true,
    aiFeedback: '완벽합니다! DISTINCT 키워드를 정확히 이해하고 있습니다.',
  },
  {
    userAnswer: 'C',
    answerStatus: 'correct',
    isBookmarked: false,
    aiFeedback: 'INNER JOIN의 개념을 잘 이해하고 있습니다.',
  },
  {
    userAnswer: 'function quickSort(arr) { ... }',
    answerStatus: 'correct',
    isBookmarked: true,
    aiFeedback: '퀵 정렬을 올바르게 구현했습니다. 평균 시간 복잡도 O(n log n)을 달성했습니다.',
  },
  {
    userAnswer: 'B',
    answerStatus: 'correct',
    isBookmarked: false,
    aiFeedback: 'B+tree의 특징을 정확히 알고 있습니다.',
  },
  {
    userAnswer: 'Hash Table을 사용하여 O(n) 시간에 Two Sum 해결',
    answerStatus: 'correct',
    isBookmarked: true,
    aiFeedback:
      '최적의 알고리즘을 선택했습니다. 공간 복잡도와 시간 복잡도의 트레이드오프를 잘 이해하고 있습니다.',
  },
  {
    userAnswer: 'TCP는 연결 지향 프로토콜로, 3-way handshake를 통해 연결을 수립합니다.',
    answerStatus: 'correct',
    isBookmarked: false,
    aiFeedback: 'TCP의 핵심 개념을 잘 설명했습니다.',
  },
  {
    userAnswer: 'D',
    answerStatus: 'correct',
    isBookmarked: false,
    aiFeedback: 'HTTP 메서드를 정확히 이해하고 있습니다.',
  },
  {
    userAnswer: 'function reverseLinkedList(head) { ... }',
    answerStatus: 'correct',
    isBookmarked: true,
    aiFeedback:
      '연결 리스트 반전 알고리즘을 완벽히 구현했습니다. 반복문과 포인터 조작을 정확히 수행했습니다.',
  },

  // ===== 오답 6개 =====
  {
    userAnswer: 'B',
    answerStatus: 'incorrect',
    isBookmarked: false,
    aiFeedback:
      'GROUP BY와 HAVING의 차이를 다시 학습해보세요. WHERE는 그룹화 전, HAVING은 그룹화 후에 필터링합니다.',
  },
  {
    userAnswer: 'function binarySearch(arr, target) { /* 잘못된 구현 */ }',
    answerStatus: 'incorrect',
    isBookmarked: true,
    aiFeedback:
      '이진 탐색의 중간값 계산에 오류가 있습니다. mid = left + (right - left) / 2 형태로 수정해보세요.',
  },
  {
    userAnswer: 'A',
    answerStatus: 'incorrect',
    isBookmarked: false,
    aiFeedback: 'DNS의 역할을 다시 확인해보세요. DNS는 도메인 이름을 IP 주소로 변환합니다.',
  },
  {
    userAnswer: 'Hashing은 정렬된 데이터 구조입니다.',
    answerStatus: 'incorrect',
    isBookmarked: true,
    aiFeedback:
      'Hashing은 정렬되지 않은 자료구조입니다. 평균 O(1) 시간에 검색/삽입/삭제가 가능하지만 순서는 보장되지 않습니다.',
  },
  {
    userAnswer: 'C',
    answerStatus: 'incorrect',
    isBookmarked: false,
    aiFeedback: 'OSI 7계층의 순서를 다시 학습해보세요. 전송 계층(Transport Layer)은 4계층입니다.',
  },
  {
    userAnswer: 'function mergeSort(arr) { /* 불완전한 구현 */ }',
    answerStatus: 'incorrect',
    isBookmarked: false,
    aiFeedback:
      'Merge Sort의 병합 단계에서 배열 인덱스 처리에 오류가 있습니다. 베이스 케이스를 확인해보세요.',
  },

  // ===== 부분 정답 1개 =====
  {
    userAnswer: 'DFS를 사용하여 이진 트리를 순회합니다. (구현 일부 누락)',
    answerStatus: 'partial',
    isBookmarked: true,
    aiFeedback:
      '개념은 올바르게 이해했습니다. 하지만 스택 또는 재귀를 사용한 구체적인 구현이 추가되면 더 좋겠습니다. 중위 순회(Inorder)의 경우 왼쪽 → 루트 → 오른쪽 순서입니다.',
  },
];
