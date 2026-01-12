export interface SeedCategory {
  name: string;
  children?: SeedCategory[];
}

export interface SeedQuestion {
  questionType: 'multiple' | 'short' | 'essay';
  content: string | { question: string; options: Record<string, string> };
  correctAnswer: string;
  difficulty: number;
  categoryPath: string[];
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: 'DB',
    children: [{ name: 'SQL' }, { name: 'B+tree' }, { name: 'Hashing' }, { name: 'Sorting' }],
  },
  {
    name: '네트워크',
    children: [{ name: 'TCP/IP' }, { name: 'HTTP' }, { name: 'DNS' }, { name: 'OSI 7계층' }],
  },
];

export const SEED_QUESTIONS: SeedQuestion[] = [
  // ===== DB > SQL =====
  {
    questionType: 'multiple',
    content: {
      question: 'SELECT 문에서 중복을 제거하는 키워드는?',
      options: { A: 'DISTINCT', B: 'UNIQUE', C: 'DIFFERENT', D: 'REMOVE' },
    },
    correctAnswer: 'A',
    difficulty: 1,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'multiple',
    content: {
      question: 'INNER JOIN과 LEFT JOIN의 차이점으로 올바른 것은?',
      options: {
        A: 'INNER JOIN은 왼쪽 테이블의 모든 데이터를 반환한다',
        B: 'LEFT JOIN은 양쪽 테이블에 모두 존재하는 데이터만 반환한다',
        C: 'INNER JOIN은 양쪽 테이블에 모두 존재하는 데이터만 반환한다',
        D: '둘은 완전히 동일하다',
      },
    },
    correctAnswer: 'C',
    difficulty: 2,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'short',
    content: 'GROUP BY와 HAVING의 차이는?',
    correctAnswer: 'GROUP BY는 그룹화, HAVING은 그룹화 후 조건',
    difficulty: 2,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'short',
    content: '서브쿼리(Subquery)란?',
    correctAnswer: '쿼리 내부의 중첩된 쿼리',
    difficulty: 3,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content: '트랜잭션의 ACID 속성을 각각 설명하고, 각 속성이 왜 중요한지 서술하세요.',
    correctAnswer:
      'ACID는 트랜잭션의 4가지 핵심 속성입니다. Atomicity(원자성)는 트랜잭션의 모든 연산이 완전히 수행되거나 전혀 수행되지 않음을 보장하여 데이터 일관성을 유지합니다. Consistency(일관성)는 트랜잭션 전후로 데이터베이스가 일관된 상태를 유지하도록 보장합니다. Isolation(격리성)은 동시에 실행되는 트랜잭션들이 서로 영향을 주지 않도록 격리하여 동시성 제어를 가능하게 합니다. Durability(지속성)은 커밋된 트랜잭션의 결과가 영구적으로 반영되어 시스템 장애 시에도 데이터가 보존되도록 합니다.',
    difficulty: 4,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content: '인덱스를 사용했을 때의 장점과 단점을 설명하세요.',
    correctAnswer:
      '인덱스의 장점은 검색 속도가 크게 향상되고, ORDER BY나 GROUP BY 연산의 성능이 개선된다는 것입니다. 특히 WHERE 절에서 자주 사용되는 컬럼에 인덱스를 생성하면 효과적입니다. 단점으로는 인덱스 자체가 추가 저장 공간을 차지하며, INSERT, UPDATE, DELETE 연산 시 인덱스도 함께 수정해야 하므로 쓰기 성능이 저하될 수 있습니다. 따라서 읽기가 많고 쓰기가 적은 테이블에 적합합니다.',
    difficulty: 4,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'multiple',
    content: {
      question: 'SQL에서 NULL 값을 체크하는 올바른 방법은?',
      options: {
        A: 'WHERE column = NULL',
        B: 'WHERE column == NULL',
        C: 'WHERE column IS NULL',
        D: 'WHERE column EQUALS NULL',
      },
    },
    correctAnswer: 'C',
    difficulty: 1,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'short',
    content: 'PRIMARY KEY의 특징은?',
    correctAnswer: 'UNIQUE + NOT NULL',
    difficulty: 2,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content:
      'INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN의 차이점을 예시와 함께 설명하세요.',
    correctAnswer:
      'INNER JOIN은 양쪽 테이블에 모두 존재하는 행만 반환합니다. 예를 들어 사용자와 주문 테이블을 INNER JOIN하면 주문한 사용자만 조회됩니다. LEFT JOIN은 왼쪽 테이블의 모든 행과 오른쪽 테이블의 매칭되는 행을 반환하며, 매칭되지 않으면 NULL을 반환합니다. 주문하지 않은 사용자도 포함됩니다. RIGHT JOIN은 LEFT JOIN의 반대로 오른쪽 테이블 기준입니다. FULL OUTER JOIN은 양쪽 테이블의 모든 행을 반환하며, 매칭되지 않는 부분은 NULL로 채웁니다. 실무에서는 LEFT JOIN이 가장 많이 사용됩니다.',
    difficulty: 3,
    categoryPath: ['DB', 'SQL'],
  },

  // ===== DB > B+tree =====
  {
    questionType: 'multiple',
    content: {
      question: 'B+tree에 대한 설명으로 올바른 것은?',
      options: {
        A: 'B+tree는 이진 트리의 일종이다',
        B: 'B+tree의 모든 데이터는 리프 노드에만 저장된다',
        C: 'B+tree는 균형을 유지하지 않는다',
        D: 'B+tree는 검색만 가능하고 삽입은 불가능하다',
      },
    },
    correctAnswer: 'B',
    difficulty: 2,
    categoryPath: ['DB', 'B+tree'],
  },
  {
    questionType: 'multiple',
    content: {
      question: 'B+tree에서 검색의 시간 복잡도는?',
      options: {
        A: 'O(1)',
        B: 'O(log n)',
        C: 'O(n)',
        D: 'O(n log n)',
      },
    },
    correctAnswer: 'B',
    difficulty: 3,
    categoryPath: ['DB', 'B+tree'],
  },
  {
    questionType: 'short',
    content: 'B+tree와 B-tree의 가장 큰 차이는?',
    correctAnswer: '데이터 저장 위치 (B+tree는 리프 노드에만)',
    difficulty: 4,
    categoryPath: ['DB', 'B+tree'],
  },
  {
    questionType: 'short',
    content: 'B+tree가 DB 인덱스로 많이 사용되는 이유는?',
    correctAnswer: '균형 유지, 범위 검색 효율, 디스크 I/O 최소화',
    difficulty: 3,
    categoryPath: ['DB', 'B+tree'],
  },
  {
    questionType: 'essay',
    content: 'B+tree의 삽입 알고리즘을 설명하고, split 과정을 서술하세요.',
    correctAnswer:
      'B+tree 삽입 시 먼저 적절한 리프 노드를 찾아 키를 추가합니다. 리프 노드가 최대 키 개수를 초과하면 split이 발생합니다. Split 시 중간 키를 기준으로 노드를 둘로 나누고, 중간 키를 부모 노드로 올립니다. 부모 노드도 오버플로우되면 재귀적으로 split을 수행하며, 루트 노드가 split되면 새로운 루트를 생성하여 트리의 높이가 1 증가합니다. 리프 노드는 데이터와 함께 형제 노드로의 포인터도 유지해야 합니다.',
    difficulty: 5,
    categoryPath: ['DB', 'B+tree'],
  },
  {
    questionType: 'essay',
    content: 'B+tree의 삭제 알고리즘을 설명하고, underflow 처리 방법을 서술하세요.',
    correctAnswer:
      'B+tree 삭제 시 리프 노드에서 키를 제거합니다. 노드의 키 개수가 최소값 미만으로 떨어지면 underflow가 발생합니다. 이때 형제 노드에서 키를 빌려오는 redistribution을 시도하고, 불가능하면 형제 노드와 merge합니다. Merge 시 부모 노드의 키도 함께 내려오며, 부모에서도 underflow가 발생하면 재귀적으로 처리합니다. 루트까지 merge되면 트리의 높이가 1 감소합니다.',
    difficulty: 5,
    categoryPath: ['DB', 'B+tree'],
  },
  {
    questionType: 'multiple',
    content: {
      question: 'B+tree의 장점이 아닌 것은?',
      options: {
        A: '범위 검색에 효율적이다',
        B: '균형 잡힌 트리 구조를 유지한다',
        C: '삽입/삭제 시 O(1) 시간이 걸린다',
        D: '순차 접근이 빠르다',
      },
    },
    correctAnswer: 'C',
    difficulty: 3,
    categoryPath: ['DB', 'B+tree'],
  },
  {
    questionType: 'short',
    content: 'B+tree의 order란?',
    correctAnswer: '노드가 가질 수 있는 최대 자식 수',
    difficulty: 3,
    categoryPath: ['DB', 'B+tree'],
  },
  {
    questionType: 'essay',
    content:
      'B+tree와 해시 테이블을 비교하고, 각각 어떤 상황에서 사용하는 것이 적합한지 설명하세요.',
    correctAnswer:
      'B+tree는 O(log n) 검색 시간을 가지며 범위 검색과 정렬된 순회가 가능합니다. 해시 테이블은 O(1) 평균 검색 시간을 가지지만 범위 검색이 불가능합니다. B+tree는 범위 검색이 필요한 경우(예: 날짜 범위, 가격 범위), 정렬된 데이터가 필요한 경우, 부분 일치 검색이 필요한 경우에 적합합니다. 해시 테이블은 정확한 일치 검색만 필요하고 최대한 빠른 검색이 중요한 경우에 적합합니다. 데이터베이스 인덱스는 대부분 B+tree를 사용하는데, 이는 다양한 쿼리 패턴을 지원해야 하기 때문입니다.',
    difficulty: 4,
    categoryPath: ['DB', 'B+tree'],
  },

  // ===== DB > Hashing =====
  {
    questionType: 'multiple',
    content: {
      question: '해시 테이블의 평균 검색 시간 복잡도는?',
      options: {
        A: 'O(1)',
        B: 'O(log n)',
        C: 'O(n)',
        D: 'O(n^2)',
      },
    },
    correctAnswer: 'A',
    difficulty: 2,
    categoryPath: ['DB', 'Hashing'],
  },
  {
    questionType: 'multiple',
    content: {
      question: '해시 충돌(Hash Collision) 해결 방법이 아닌 것은?',
      options: {
        A: 'Chaining',
        B: 'Open Addressing',
        C: 'Binary Search',
        D: 'Double Hashing',
      },
    },
    correctAnswer: 'C',
    difficulty: 3,
    categoryPath: ['DB', 'Hashing'],
  },
  {
    questionType: 'short',
    content: 'Chaining 방식이란?',
    correctAnswer: '충돌 시 연결 리스트로 관리',
    difficulty: 3,
    categoryPath: ['DB', 'Hashing'],
  },
  {
    questionType: 'short',
    content: 'Open Addressing 방식이란?',
    correctAnswer: '충돌 시 다른 빈 버킷 탐색',
    difficulty: 3,
    categoryPath: ['DB', 'Hashing'],
  },
  {
    questionType: 'essay',
    content:
      '좋은 해시 함수의 조건을 설명하고, 해시 테이블의 Load Factor가 성능에 미치는 영향을 서술하세요.',
    correctAnswer:
      '좋은 해시 함수는 첫째, 계산이 빠르고 간단해야 하며, 둘째, 키들을 해시 테이블 전체에 균등하게 분산시켜야 합니다(uniform distribution). 셋째, 충돌을 최소화해야 합니다. Load Factor는 테이블 크기 대비 저장된 키의 비율로, 값이 높아질수록 충돌 확률이 증가하여 성능이 저하됩니다. Chaining의 경우 Load Factor가 1을 초과해도 동작하지만 검색 시간이 O(n)에 가까워지고, Open Addressing은 Load Factor가 높아지면 빈 슬롯 찾기가 어려워져 성능이 급격히 저하됩니다. 일반적으로 Load Factor가 0.7-0.75를 넘으면 테이블 크기를 늘리는 rehashing을 수행합니다.',
    difficulty: 5,
    categoryPath: ['DB', 'Hashing'],
  },
  {
    questionType: 'essay',
    content: '데이터베이스에서 해시 인덱스와 B+tree 인덱스를 비교하고, 각각의 장단점을 설명하세요.',
    correctAnswer:
      '해시 인덱스는 등호(=) 검색에서 O(1)의 매우 빠른 성능을 제공하지만, 범위 검색이나 정렬된 순서 접근이 불가능합니다. 또한 해시 충돌과 Load Factor 관리가 필요하며, 동적 크기 조정 시 rehashing 비용이 큽니다. B+tree 인덱스는 O(log n) 성능으로 약간 느리지만, 범위 검색과 정렬된 순회가 가능하고, 부분 일치 검색(LIKE)도 지원합니다. 또한 균형 잡힌 구조로 최악의 경우에도 안정적인 성능을 보장합니다. 따라서 등호 검색만 필요한 경우 해시 인덱스가, 다양한 검색 패턴이 필요한 경우 B+tree 인덱스가 적합합니다.',
    difficulty: 5,
    categoryPath: ['DB', 'Hashing'],
  },
  {
    questionType: 'multiple',
    content: {
      question: 'Double Hashing의 주요 목적은?',
      options: {
        A: '해시 값을 두 번 계산하여 보안 강화',
        B: '충돌 발생 시 두 번째 해시 함수로 탐사 간격 결정',
        C: '두 개의 해시 테이블 사용',
        D: '해시 값을 두 배로 확장',
      },
    },
    correctAnswer: 'B',
    difficulty: 4,
    categoryPath: ['DB', 'Hashing'],
  },
  {
    questionType: 'short',
    content: 'Linear Probing의 단점은?',
    correctAnswer: 'Primary Clustering 발생',
    difficulty: 4,
    categoryPath: ['DB', 'Hashing'],
  },
  {
    questionType: 'essay',
    content: 'Consistent Hashing이 무엇인지 설명하고, 분산 시스템에서 왜 중요한지 서술하세요.',
    correctAnswer:
      'Consistent Hashing은 해시 테이블을 원형 링 구조로 구성하여 노드를 추가하거나 제거할 때 최소한의 키만 재배치하는 해싱 기법입니다. 일반적인 해싱은 노드 개수가 변경되면 대부분의 키가 재배치되어야 하지만(전체 키의 k/n), Consistent Hashing은 평균적으로 k/n개의 키만 재배치됩니다(n은 노드 수). 분산 캐시, 로드 밸런서, 분산 데이터베이스에서 노드를 동적으로 추가/제거해야 하는 경우 필수적입니다. Virtual Node 개념을 도입하여 부하 분산을 더욱 균등하게 할 수 있습니다. Redis Cluster, Cassandra, DynamoDB 등에서 활용됩니다.',
    difficulty: 5,
    categoryPath: ['DB', 'Hashing'],
  },

  // ===== DB > Sorting =====
  {
    questionType: 'multiple',
    content: {
      question: 'Quick Sort의 평균 시간 복잡도는?',
      options: {
        A: 'O(n)',
        B: 'O(n log n)',
        C: 'O(n^2)',
        D: 'O(log n)',
      },
    },
    correctAnswer: 'B',
    difficulty: 2,
    categoryPath: ['DB', 'Sorting'],
  },
  {
    questionType: 'multiple',
    content: {
      question: '안정 정렬(Stable Sort) 알고리즘이 아닌 것은?',
      options: {
        A: 'Merge Sort',
        B: 'Insertion Sort',
        C: 'Quick Sort',
        D: 'Bubble Sort',
      },
    },
    correctAnswer: 'C',
    difficulty: 3,
    categoryPath: ['DB', 'Sorting'],
  },
  {
    questionType: 'short',
    content: '안정 정렬(Stable Sort)이란?',
    correctAnswer: '같은 값의 상대적 순서 유지',
    difficulty: 2,
    categoryPath: ['DB', 'Sorting'],
  },
  {
    questionType: 'short',
    content: '외부 정렬(External Sort)이 필요한 이유는?',
    correctAnswer: '메모리보다 큰 데이터 정렬',
    difficulty: 4,
    categoryPath: ['DB', 'Sorting'],
  },
  {
    questionType: 'essay',
    content: 'Merge Sort의 동작 원리를 설명하고, 시간 복잡도를 분석하세요.',
    correctAnswer:
      'Merge Sort는 분할 정복(Divide and Conquer) 알고리즘입니다. 배열을 재귀적으로 반으로 나누어 크기가 1이 될 때까지 분할한 후, 두 개의 정렬된 부분 배열을 병합하면서 전체를 정렬합니다. 병합 과정에서 두 배열의 앞에서부터 비교하며 작은 값을 결과 배열에 추가합니다. 분할 단계는 log n 레벨이며, 각 레벨에서 병합에 O(n) 시간이 소요되므로 전체 시간 복잡도는 O(n log n)입니다. 최선, 평균, 최악 모두 O(n log n)으로 일정하며, 안정 정렬이라는 장점이 있습니다. 단점은 O(n)의 추가 공간이 필요하다는 것입니다.',
    difficulty: 4,
    categoryPath: ['DB', 'Sorting'],
  },
  {
    questionType: 'essay',
    content: 'Quick Sort의 동작 원리를 설명하고, 최악의 경우를 피하는 방법을 서술하세요.',
    correctAnswer:
      'Quick Sort는 pivot을 선택하여 pivot보다 작은 값은 왼쪽, 큰 값은 오른쪽으로 분할한 후 재귀적으로 정렬하는 알고리즘입니다. 평균적으로 O(n log n)의 빠른 성능을 보이지만, pivot 선택이 나쁘면 O(n^2)까지 느려질 수 있습니다. 최악의 경우를 피하기 위한 방법으로는 첫째, 랜덤하게 pivot을 선택하거나, 둘째, median-of-three 방식으로 첫 번째, 중간, 마지막 원소의 중간값을 pivot으로 선택하는 방법이 있습니다. 또한 작은 부분 배열에서는 Insertion Sort로 전환하여 성능을 개선할 수 있습니다. Quick Sort는 제자리 정렬(in-place)로 추가 메모리가 적게 필요하지만 불안정 정렬입니다.',
    difficulty: 5,
    categoryPath: ['DB', 'Sorting'],
  },
  {
    questionType: 'multiple',
    content: {
      question: 'Heap Sort의 시간 복잡도는?',
      options: {
        A: 'O(n)',
        B: 'O(n log n)',
        C: 'O(n^2)',
        D: 'O(log n)',
      },
    },
    correctAnswer: 'B',
    difficulty: 3,
    categoryPath: ['DB', 'Sorting'],
  },
  {
    questionType: 'short',
    content: 'Radix Sort의 시간 복잡도는?',
    correctAnswer: 'O(d*n) (d는 자릿수)',
    difficulty: 4,
    categoryPath: ['DB', 'Sorting'],
  },
  {
    questionType: 'essay',
    content: 'Counting Sort의 동작 원리와 제약 조건, 그리고 적합한 사용 사례를 설명하세요.',
    correctAnswer:
      'Counting Sort는 비교 기반이 아닌 정렬 알고리즘으로, 각 값의 출현 횟수를 세어 정렬합니다. 0부터 k까지의 값 범위에서 각 값의 개수를 카운트 배열에 저장하고, 누적합을 계산한 후 원소를 적절한 위치에 배치합니다. 시간 복잡도는 O(n+k)로 매우 빠르지만, k가 n보다 매우 크면 비효율적입니다. 제약 조건은 정수나 정수로 표현 가능한 데이터만 정렬 가능하고, 값의 범위가 제한적이어야 합니다. O(k)의 추가 공간이 필요하며 안정 정렬입니다. 적합한 사례는 나이, 학년, 점수 등 작은 범위의 정수 데이터를 정렬할 때입니다. Radix Sort의 기반 알고리즘으로도 사용됩니다.',
    difficulty: 4,
    categoryPath: ['DB', 'Sorting'],
  },

  // ===== 네트워크 > TCP/IP =====
  {
    questionType: 'multiple',
    content: {
      question: 'TCP 3-way handshake의 올바른 순서는?',
      options: {
        A: 'SYN → ACK → FIN',
        B: 'SYN → SYN-ACK → ACK',
        C: 'SYN → ACK → SYN',
        D: 'ACK → SYN → ACK',
      },
    },
    correctAnswer: 'B',
    difficulty: 2,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'multiple',
    content: {
      question: 'TCP와 UDP의 차이점으로 올바르지 않은 것은?',
      options: {
        A: 'TCP는 연결 지향, UDP는 비연결 지향이다',
        B: 'TCP는 신뢰성을 보장하고, UDP는 보장하지 않는다',
        C: 'TCP는 순서를 보장하고, UDP는 보장하지 않는다',
        D: 'TCP가 UDP보다 항상 빠르다',
      },
    },
    correctAnswer: 'D',
    difficulty: 2,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'short',
    content: 'TCP 흐름 제어(Flow Control)의 목적은?',
    correctAnswer: '수신자 버퍼 오버플로우 방지',
    difficulty: 3,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'short',
    content: 'TCP 혼잡 제어(Congestion Control)의 목적은?',
    correctAnswer: '네트워크 혼잡 방지',
    difficulty: 3,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'essay',
    content:
      'TCP의 3-way handshake와 4-way handshake를 각각 설명하고, 왜 연결 종료 시에는 4단계가 필요한지 서술하세요.',
    correctAnswer:
      '3-way handshake는 TCP 연결 수립 과정으로, 클라이언트가 SYN을 보내고, 서버가 SYN-ACK로 응답하며, 클라이언트가 ACK를 보내 연결이 수립됩니다. 4-way handshake는 연결 종료 과정으로, 클라이언트가 FIN을 보내고, 서버가 ACK로 응답한 후, 서버가 FIN을 보내고, 클라이언트가 ACK로 응답합니다. 연결 종료 시 4단계가 필요한 이유는 TCP가 전이중(Full-Duplex) 통신이기 때문입니다. 한쪽이 데이터 전송을 종료해도 상대방은 아직 보낼 데이터가 남아있을 수 있으므로, 양방향 연결을 각각 독립적으로 종료해야 합니다. 따라서 각 방향의 FIN과 ACK가 필요하여 총 4단계가 됩니다.',
    difficulty: 4,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'essay',
    content: 'TCP의 재전송 메커니즘을 설명하고, Timeout과 Fast Retransmit의 차이를 서술하세요.',
    correctAnswer:
      'TCP는 신뢰성 있는 통신을 위해 ACK를 받지 못한 세그먼트를 재전송합니다. Timeout 기반 재전송은 RTT(Round Trip Time)를 기반으로 계산된 타이머가 만료되면 세그먼트를 재전송하는 방식입니다. RTO(Retransmission Timeout)는 동적으로 조정되며, 네트워크 상황에 따라 변합니다. Fast Retransmit은 3개의 중복 ACK를 받으면 타이머 만료를 기다리지 않고 즉시 재전송하는 방식입니다. 중복 ACK는 순서가 틀린 세그먼트가 도착했음을 의미하며, 이는 패킷 손실의 강력한 신호입니다. Fast Retransmit은 Timeout보다 빠르게 손실을 복구하여 처리량을 향상시킵니다. 두 메커니즘은 함께 사용되어 다양한 손실 시나리오에 대응합니다.',
    difficulty: 5,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'multiple',
    content: {
      question: 'UDP의 특징이 아닌 것은?',
      options: {
        A: '비연결 지향',
        B: '신뢰성 보장 안함',
        C: '순서 보장',
        D: '빠른 전송 속도',
      },
    },
    correctAnswer: 'C',
    difficulty: 2,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'short',
    content: 'TCP의 Sliding Window 기법의 목적은?',
    correctAnswer: '흐름 제어 및 파이프라이닝',
    difficulty: 3,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'essay',
    content: 'TCP의 Slow Start와 Congestion Avoidance 알고리즘을 설명하세요.',
    correctAnswer:
      'Slow Start는 연결 초기에 혼잡 윈도우(cwnd)를 1 MSS로 시작하여 ACK를 받을 때마다 지수적으로 증가시키는 알고리즘입니다(1→2→4→8...). Slow Start Threshold(ssthresh)에 도달하면 Congestion Avoidance로 전환됩니다. Congestion Avoidance는 cwnd를 선형적으로 증가시켜(RTT마다 1 MSS) 네트워크 용량을 조심스럽게 탐색합니다. 패킷 손실이 감지되면(3 duplicate ACKs 또는 timeout) ssthresh를 cwnd의 절반으로 줄이고 Slow Start를 재시작합니다. Timeout 발생 시 cwnd를 1로 초기화하고, Fast Retransmit/Fast Recovery의 경우 cwnd를 ssthresh로 줄입니다. 이를 통해 네트워크 혼잡을 회피하면서 대역폭을 효율적으로 사용합니다.',
    difficulty: 5,
    categoryPath: ['네트워크', 'TCP/IP'],
  },

  // ===== 네트워크 > HTTP =====
  {
    questionType: 'multiple',
    content: {
      question: 'HTTP 메서드 중 멱등성(Idempotent)을 보장하지 않는 것은?',
      options: {
        A: 'GET',
        B: 'PUT',
        C: 'DELETE',
        D: 'POST',
      },
    },
    correctAnswer: 'D',
    difficulty: 3,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'multiple',
    content: {
      question: 'HTTP 상태 코드 중 리다이렉션을 나타내는 범위는?',
      options: {
        A: '2xx',
        B: '3xx',
        C: '4xx',
        D: '5xx',
      },
    },
    correctAnswer: 'B',
    difficulty: 1,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'short',
    content: 'HTTP의 Stateless 특징이란?',
    correctAnswer: '서버가 이전 요청 정보 미저장',
    difficulty: 2,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'short',
    content: 'GET과 POST의 가장 큰 차이는?',
    correctAnswer: 'GET은 조회/멱등성, POST는 생성/비멱등성',
    difficulty: 2,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'essay',
    content: 'HTTP/1.1과 HTTP/2의 주요 차이점을 설명하고, HTTP/2의 성능 개선 기법을 서술하세요.',
    correctAnswer:
      'HTTP/1.1은 텍스트 기반 프로토콜로 한 번에 하나의 요청만 처리할 수 있어 HOL(Head-of-Line) Blocking 문제가 발생합니다. HTTP/2는 이를 개선하기 위해 바이너리 프레이밍 계층을 도입하고, 다중화(Multiplexing)를 지원하여 하나의 연결에서 여러 요청을 동시에 처리합니다. 또한 서버 푸시(Server Push)로 클라이언트 요청 전에 필요한 리소스를 미리 전송하고, 헤더 압축(HPACK)으로 중복 헤더를 제거하여 대역폭을 절약합니다. 스트림 우선순위 지정으로 중요한 리소스를 먼저 전송할 수 있습니다. 이러한 개선으로 HTTP/2는 페이지 로딩 속도가 크게 향상되었습니다.',
    difficulty: 4,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'essay',
    content: 'HTTPS의 동작 원리를 설명하고, SSL/TLS 핸드셰이크 과정을 서술하세요.',
    correctAnswer:
      'HTTPS는 HTTP에 SSL/TLS 계층을 추가하여 데이터를 암호화하는 프로토콜입니다. SSL/TLS 핸드셰이크는 다음과 같이 진행됩니다. 1) 클라이언트가 Client Hello를 보내며 지원하는 암호화 방식을 전달합니다. 2) 서버가 Server Hello로 응답하며 사용할 암호화 방식을 선택하고 인증서를 전송합니다. 3) 클라이언트가 인증서를 검증하고, 공개키로 암호화한 pre-master secret을 서버에 전송합니다. 4) 양측이 pre-master secret으로 세션 키를 생성하고, Finished 메시지를 교환하여 핸드셰이크를 완료합니다. 이후 세션 키로 대칭키 암호화 통신을 진행합니다. HTTPS는 데이터 기밀성, 무결성, 서버 인증을 제공하여 중간자 공격을 방지합니다.',
    difficulty: 5,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'multiple',
    content: {
      question: 'HTTP/3가 사용하는 전송 프로토콜은?',
      options: {
        A: 'TCP',
        B: 'UDP (QUIC)',
        C: 'SCTP',
        D: 'DCCP',
      },
    },
    correctAnswer: 'B',
    difficulty: 4,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'short',
    content: 'REST API에서 리소스 생성에 사용하는 메서드는?',
    correctAnswer: 'POST',
    difficulty: 1,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'essay',
    content: 'HTTP 쿠키와 세션의 차이점을 설명하고, 각각의 장단점을 서술하세요.',
    correctAnswer:
      '쿠키는 클라이언트(브라우저)에 저장되는 작은 데이터 조각으로, 서버가 Set-Cookie 헤더로 전송하면 브라우저가 저장하고 이후 요청마다 자동으로 전송합니다. 세션은 서버에 저장되는 사용자 상태 정보로, 세션 ID만 쿠키로 클라이언트에 전달됩니다. 쿠키의 장점은 서버 부담이 없고 만료 시간 설정이 자유롭지만, 보안에 취약하고(XSS, CSRF) 크기 제한(4KB)이 있습니다. 세션의 장점은 민감한 정보를 서버에 저장하여 보안성이 높지만, 서버 메모리를 사용하고 다중 서버 환경에서 세션 동기화가 필요합니다. 실무에서는 JWT 같은 토큰 기반 인증이나 Redis 같은 외부 세션 스토어를 활용합니다.',
    difficulty: 3,
    categoryPath: ['네트워크', 'HTTP'],
  },

  // ===== 네트워크 > DNS =====
  {
    questionType: 'multiple',
    content: {
      question: 'DNS가 사용하는 기본 포트 번호는?',
      options: {
        A: '80',
        B: '443',
        C: '53',
        D: '8080',
      },
    },
    correctAnswer: 'C',
    difficulty: 1,
    categoryPath: ['네트워크', 'DNS'],
  },
  {
    questionType: 'multiple',
    content: {
      question: 'DNS 레코드 타입 중 IPv4 주소를 나타내는 것은?',
      options: {
        A: 'A',
        B: 'AAAA',
        C: 'CNAME',
        D: 'MX',
      },
    },
    correctAnswer: 'A',
    difficulty: 2,
    categoryPath: ['네트워크', 'DNS'],
  },
  {
    questionType: 'short',
    content: 'DNS의 주요 역할은?',
    correctAnswer: '도메인 이름을 IP 주소로 변환',
    difficulty: 1,
    categoryPath: ['네트워크', 'DNS'],
  },
  {
    questionType: 'short',
    content: 'DNS 캐싱의 목적은?',
    correctAnswer: '응답 속도 향상 및 트래픽 감소',
    difficulty: 2,
    categoryPath: ['네트워크', 'DNS'],
  },
  {
    questionType: 'essay',
    content:
      'DNS 쿼리의 두 가지 방식인 재귀적 쿼리(Recursive Query)와 반복적 쿼리(Iterative Query)를 비교 설명하세요.',
    correctAnswer:
      '재귀적 쿼리는 클라이언트가 DNS 리졸버에게 완전한 답변을 요청하는 방식입니다. 리졸버는 여러 DNS 서버에 쿼리를 보내 최종 IP 주소를 찾아 클라이언트에게 반환합니다. 클라이언트는 하나의 요청만 보내고 결과를 받으므로 편리하지만, 리졸버의 부담이 큽니다. 반복적 쿼리는 각 DNS 서버가 자신이 알고 있는 최선의 정보만 반환하는 방식입니다. 클라이언트(또는 리졸버)는 여러 서버에 순차적으로 쿼리를 보내며 답을 찾아갑니다. 일반적으로 클라이언트와 로컬 리졸버 간에는 재귀적 쿼리를, 리졸버와 다른 DNS 서버 간에는 반복적 쿼리를 사용합니다.',
    difficulty: 4,
    categoryPath: ['네트워크', 'DNS'],
  },
  {
    questionType: 'essay',
    content: 'DNS의 계층 구조를 설명하고, 도메인 이름 해석 과정을 단계별로 서술하세요.',
    correctAnswer:
      'DNS는 트리 구조의 계층적 시스템입니다. 최상위에 루트(Root) 서버가 있고, 그 아래 TLD(Top-Level Domain) 서버(.com, .org, .kr 등), 그리고 권한 있는(Authoritative) 네임 서버 순으로 구성됩니다. 도메인 이름 해석 과정은 다음과 같습니다. 1) 클라이언트가 www.example.com을 조회하면 로컬 리졸버에 재귀적 쿼리를 보냅니다. 2) 리졸버는 루트 서버에 쿼리하여 .com TLD 서버 주소를 받습니다. 3) .com TLD 서버에 쿼리하여 example.com의 권한 있는 네임 서버 주소를 받습니다. 4) 해당 네임 서버에 쿼리하여 최종 IP 주소를 받습니다. 5) 리졸버가 클라이언트에게 IP 주소를 반환하고, 각 단계의 결과를 TTL에 따라 캐싱합니다. 이 계층 구조는 전 세계적인 확장성과 분산 관리를 가능하게 합니다.',
    difficulty: 5,
    categoryPath: ['네트워크', 'DNS'],
  },
  {
    questionType: 'multiple',
    content: {
      question: 'CNAME 레코드의 역할은?',
      options: {
        A: 'IPv4 주소 매핑',
        B: '별칭(Alias) 지정',
        C: '메일 서버 지정',
        D: 'IPv6 주소 매핑',
      },
    },
    correctAnswer: 'B',
    difficulty: 2,
    categoryPath: ['네트워크', 'DNS'],
  },
  {
    questionType: 'short',
    content: 'DNS의 TTL(Time To Live)이란?',
    correctAnswer: 'DNS 레코드 캐시 유효 시간',
    difficulty: 2,
    categoryPath: ['네트워크', 'DNS'],
  },
  {
    questionType: 'essay',
    content: 'DNS Amplification Attack이 무엇인지 설명하고, 방어 방법을 서술하세요.',
    correctAnswer:
      'DNS Amplification Attack은 DDoS 공격의 일종으로, 공격자가 DNS 서버를 이용해 소량의 요청으로 대량의 응답을 생성하여 피해자에게 전송하는 공격입니다. 공격자는 출발지 IP를 피해자 IP로 위조(IP Spoofing)하고 ANY 쿼리 같은 큰 응답을 유발하는 쿼리를 DNS 서버에 보냅니다. DNS 서버는 피해자에게 수십~수백 배 증폭된 응답을 보내 대역폭을 고갈시킵니다. 방어 방법으로는 첫째, Rate Limiting으로 특정 IP의 쿼리 속도를 제한하고, 둘째, Response Rate Limiting(RRL)으로 동일 응답의 반복을 제한하며, 셋째, ANY 쿼리를 차단하고, 넷째, BCP38(Best Current Practice 38)을 구현하여 ISP 레벨에서 IP Spoofing을 차단합니다. 또한 DNSSEC을 사용하여 DNS 보안을 강화할 수 있습니다.',
    difficulty: 5,
    categoryPath: ['네트워크', 'DNS'],
  },

  // ===== 네트워크 > OSI 7계층 =====
  {
    questionType: 'multiple',
    content: {
      question: 'OSI 7계층 모델에서 전송 계층(Transport Layer)은 몇 번째 계층인가?',
      options: {
        A: '3계층',
        B: '4계층',
        C: '5계층',
        D: '6계층',
      },
    },
    correctAnswer: 'B',
    difficulty: 1,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'multiple',
    content: {
      question: '라우터(Router)가 동작하는 OSI 계층은?',
      options: {
        A: '1계층 (물리 계층)',
        B: '2계층 (데이터 링크 계층)',
        C: '3계층 (네트워크 계층)',
        D: '4계층 (전송 계층)',
      },
    },
    correctAnswer: 'C',
    difficulty: 2,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'short',
    content: 'OSI 7계층을 순서대로 나열하면?',
    correctAnswer: '물리-데이터링크-네트워크-전송-세션-표현-응용',
    difficulty: 1,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'short',
    content: '데이터 링크 계층(Layer 2)의 주요 역할은?',
    correctAnswer: 'MAC 주소 기반 프레임 전달, 오류 검출',
    difficulty: 2,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'essay',
    content: 'OSI 7계층 모델과 TCP/IP 4계층 모델을 비교하고, 각 모델의 장단점을 설명하세요.',
    correctAnswer:
      'OSI 7계층 모델은 네트워크 통신을 7개의 논리적 계층으로 세분화한 이론적 모델입니다. 물리, 데이터 링크, 네트워크, 전송, 세션, 표현, 응용 계층으로 구성되며, 각 계층이 명확히 분리되어 교육과 표준화에 유용합니다. TCP/IP 4계층 모델은 실제 인터넷에서 사용되는 실용적 모델로, 네트워크 인터페이스, 인터넷, 전송, 응용 계층으로 구성됩니다. OSI의 세션, 표현, 응용 계층이 TCP/IP에서는 응용 계층으로 통합되었습니다. OSI 모델은 개념적으로 완성도가 높고 각 계층의 역할이 명확하지만 복잡하고 실제 구현과 차이가 있습니다. TCP/IP 모델은 실용적이고 간결하며 실제 인터넷 프로토콜과 일치하지만, 계층 분리가 덜 명확합니다. 현대 네트워크는 TCP/IP 모델을 따르지만, OSI 모델은 네트워크 개념 설명과 문제 진단에 여전히 활용됩니다.',
    difficulty: 4,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'essay',
    content: '캡슐화(Encapsulation)와 역캡슐화(Decapsulation) 과정을 OSI 계층별로 설명하세요.',
    correctAnswer:
      '캡슐화는 송신 측에서 데이터가 상위 계층에서 하위 계층으로 내려가며 각 계층의 헤더(또는 트레일러)가 추가되는 과정입니다. 7계층(응용)에서 사용자 데이터가 생성되고, 6계층(표현)에서 데이터 형식 변환 및 암호화가 이루어집니다. 5계층(세션)에서 세션 정보가 추가되고, 4계층(전송)에서 TCP/UDP 헤더가 붙어 세그먼트가 됩니다. 3계층(네트워크)에서 IP 헤더가 추가되어 패킷이 되고, 2계층(데이터 링크)에서 MAC 헤더와 트레일러가 추가되어 프레임이 됩니다. 마지막으로 1계층(물리)에서 비트 스트림으로 변환되어 전송됩니다. 역캡슐화는 수신 측에서 하위 계층부터 순차적으로 헤더를 제거하며 데이터를 추출하는 과정으로, 각 계층에서 해당 계층의 헤더를 해석하고 제거한 후 상위 계층으로 전달합니다. 이 과정을 통해 계층 간 독립성이 유지되고 모듈화된 네트워크 구조가 가능해집니다.',
    difficulty: 5,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'multiple',
    content: {
      question: '네트워크 계층(Layer 3)에서 사용하는 주소 체계는?',
      options: {
        A: 'MAC 주소',
        B: 'IP 주소',
        C: 'Port 번호',
        D: 'Domain 이름',
      },
    },
    correctAnswer: 'B',
    difficulty: 1,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'short',
    content: '스위치(Switch)가 동작하는 OSI 계층은?',
    correctAnswer: '2계층 (데이터 링크)',
    difficulty: 2,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'essay',
    content: '세션 계층(Layer 5)의 역할과 주요 프로토콜을 설명하세요.',
    correctAnswer:
      '세션 계층은 응용 프로그램 간의 대화(세션)를 설정, 관리, 종료하는 역할을 합니다. 데이터 교환의 경계와 동기화를 제공하며, 세션 복구 기능을 통해 통신 중단 시 재개 지점을 관리합니다. 주요 기능으로는 세션 수립 및 해제, 대화 제어(반이중/전이중), 동기화 포인트 설정, 토큰 관리 등이 있습니다. 대표적인 프로토콜로는 NetBIOS(네트워크 기본 입출력 시스템), RPC(Remote Procedure Call), PPTP(Point-to-Point Tunneling Protocol) 등이 있습니다. 실제로 TCP/IP 모델에서는 세션 계층이 응용 계층에 통합되어 있지만, 개념적으로 세션 관리는 여전히 중요한 기능입니다.',
    difficulty: 4,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
];
