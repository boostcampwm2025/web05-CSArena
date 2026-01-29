export interface SeedCategory {
  name: string;
  children?: SeedCategory[];
}

export interface SeedQuestion {
  questionType: 'multiple' | 'short' | 'essay';
  content: string | { question: string; options: Record<string, string> };
  correctAnswer: string;
  explanation: string;
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
    explanation:
      'DISTINCT 키워드는 SELECT 문 결과에서 중복된 행을 제거하고 유일한 값들만 반환하는 데 사용됩니다. UNIQUE는 제약 조건에서 사용됩니다.',
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
    explanation:
      'INNER JOIN은 두 테이블의 조인 조건이 일치하는 행만 반환합니다. 반면 LEFT JOIN은 왼쪽 테이블의 모든 행과 오른쪽 테이블의 일치하는 행을 반환하며, 일치하지 않는 경우 오른쪽 테이블 컬럼은 NULL이 됩니다.',
    difficulty: 2,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'short',
    content: 'GROUP BY와 HAVING의 차이는?',
    correctAnswer: 'GROUP BY는 그룹화, HAVING은 그룹화 후 조건',
    explanation:
      'GROUP BY 절은 행들을 특정 컬럼을 기준으로 그룹화하는 데 사용되며, HAVING 절은 그룹화된 결과에 대해 조건을 적용하여 필터링하는 데 사용됩니다. WHERE 절은 그룹화 전에 개별 행을 필터링합니다.',
    difficulty: 2,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'short',
    content: '서브쿼리(Subquery)란?',
    correctAnswer: '쿼리 내부의 중첩된 쿼리',
    explanation:
      '서브쿼리는 메인 쿼리나 다른 서브쿼리 내부에 포함된 SELECT 문입니다. WHERE 절, FROM 절, SELECT 절 등 다양한 위치에서 사용되어 복잡한 데이터 조회를 가능하게 합니다.',
    difficulty: 3,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content: '트랜잭션의 ACID 속성을 각각 설명하고, 각 속성이 왜 중요한지 서술하세요.',
    correctAnswer:
      'ACID는 트랜잭션의 4가지 핵심 속성입니다. Atomicity(원자성)는 트랜잭션의 모든 연산이 완전히 수행되거나 전혀 수행되지 않음을 보장하여 데이터 일관성을 유지합니다. Consistency(일관성)는 트랜잭션 전후로 데이터베이스가 일관된 상태를 유지하도록 보장합니다. Isolation(격리성)은 동시에 실행되는 트랜잭션들이 서로 영향을 주지 않도록 격리하여 동시성 제어를 가능하게 합니다. Durability(지속성)은 커밋된 트랜잭션의 결과가 영구적으로 반영되어 시스템 장애 시에도 데이터가 보존되도록 합니다.',
    explanation:
      'ACID 속성은 데이터베이스 시스템의 신뢰성을 보장하는 핵심 원칙입니다. 원자성은 부분적인 성공을 방지하고, 일관성은 데이터 무결성을 지키며, 격리성은 동시성 문제를 해결하고, 지속성은 데이터 손실을 막습니다. 이들이 없으면 데이터베이스는 신뢰할 수 없는 상태가 됩니다.',
    difficulty: 4,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content: '인덱스를 사용했을 때의 장점과 단점을 설명하세요.',
    correctAnswer:
      '인덱스의 장점은 검색 속도가 크게 향상되고, ORDER BY나 GROUP BY 연산의 성능이 개선된다는 것입니다. 특히 WHERE 절에서 자주 사용되는 컬럼에 인덱스를 생성하면 효과적입니다. 단점으로는 인덱스 자체가 추가 저장 공간을 차지하며, INSERT, UPDATE, DELETE 연산 시 인덱스도 함께 수정해야 하므로 쓰기 성능이 저하될 수 있습니다. 따라서 읽기가 많고 쓰기가 적은 테이블에 적합합니다.',
    explanation:
      '인덱스는 책의 색인과 같아서 데이터를 빠르게 찾을 수 있게 해주지만(검색 효율), 새로운 내용이 추가되거나 변경될 때마다 색인도 수정해야 하므로 관리 비용(쓰기 지연, 저장 공간)이 발생합니다. 따라서 데이터의 조회 빈도와 변경 빈도를 고려하여 전략적으로 생성해야 합니다.',
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
    explanation:
      'SQL에서 NULL은 "알 수 없는 값"을 의미하므로 일반적인 비교 연산자(=)로는 비교할 수 없습니다. 따라서 반드시 IS NULL 또는 IS NOT NULL 연산자를 사용해야 합니다.',
    difficulty: 1,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'short',
    content: 'PRIMARY KEY의 특징은?',
    correctAnswer: 'UNIQUE + NOT NULL',
    explanation:
      'PRIMARY KEY(기본키)는 테이블 내의 각 행을 고유하게 식별하는 컬럼입니다. 따라서 중복된 값을 가질 수 없으며(UNIQUE), NULL 값을 허용하지 않습니다(NOT NULL).',
    difficulty: 2,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content:
      'INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN의 차이점을 예시와 함께 설명하세요.',
    correctAnswer:
      'INNER JOIN은 양쪽 테이블에 모두 존재하는 행만 반환합니다. 예를 들어 사용자와 주문 테이블을 INNER JOIN하면 주문한 사용자만 조회됩니다. LEFT JOIN은 왼쪽 테이블의 모든 행과 오른쪽 테이블의 매칭되는 행을 반환하며, 매칭되지 않으면 NULL을 반환합니다. 주문하지 않은 사용자도 포함됩니다. RIGHT JOIN은 LEFT JOIN의 반대로 오른쪽 테이블 기준입니다. FULL OUTER JOIN은 양쪽 테이블의 모든 행을 반환하며, 매칭되지 않는 부분은 NULL로 채웁니다. 실무에서는 LEFT JOIN이 가장 많이 사용됩니다.',
    explanation:
      '조인(JOIN)은 여러 테이블의 데이터를 결합하는 방법입니다. INNER는 교집합, LEFT/RIGHT는 기준 테이블 전체 + 교집합, FULL OUTER는 합집합 개념입니다. 어떤 데이터를 기준으로 삼을지에 따라 적절한 조인 방식을 선택해야 합니다.',
    difficulty: 3,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content: '정규화(Normalization)의 개념과 1NF, 2NF, 3NF를 각각 설명하세요.',
    correctAnswer:
      '정규화는 데이터베이스 설계 시 중복을 최소화하고 무결성을 향상시키기 위해 테이블을 분해하는 과정입니다. 1NF(제1정규형)는 각 컬럼이 원자값(atomic value)만 가져야 하며, 반복 그룹이 없어야 합니다. 2NF는 1NF를 만족하고 부분 함수 종속을 제거해야 합니다. 즉, 기본키의 일부에만 종속되는 속성이 없어야 합니다. 3NF는 2NF를 만족하고 이행적 함수 종속을 제거해야 합니다. 즉, 기본키가 아닌 속성이 다른 비키 속성에 종속되지 않아야 합니다. 정규화를 통해 데이터 중복, 갱신 이상, 삽입 이상, 삭제 이상을 방지할 수 있습니다.',
    explanation:
      '정규화는 데이터를 구조화하여 이상 현상(Anomaly)을 방지하는 과정입니다. 1NF는 값의 원자성, 2NF는 완전 함수 종속(복합키인 경우), 3NF는 이행 함수 종속 제거(A->B, B->C일 때 A->C 제거)를 목표로 합니다. 과도한 정규화는 조인 비용을 증가시킬 수 있어 반정규화(De-normalization)를 고려하기도 합니다.',
    difficulty: 4,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content: '데이터베이스 락(Lock)의 종류와 데드락(Deadlock) 발생 조건 및 해결 방법을 설명하세요.',
    correctAnswer:
      '락은 동시성 제어를 위한 메커니즘으로, 공유 락(Shared Lock)과 배타 락(Exclusive Lock)이 있습니다. 공유 락은 읽기 작업에 사용되며 다른 공유 락과 호환되지만, 배타 락은 쓰기 작업에 사용되며 다른 어떤 락과도 호환되지 않습니다. 데드락은 두 개 이상의 트랜잭션이 서로가 점유한 자원을 기다리며 무한 대기하는 상태입니다. 발생 조건은 상호 배제(Mutual Exclusion), 점유와 대기(Hold and Wait), 비선점(No Preemption), 순환 대기(Circular Wait)입니다. 해결 방법으로는 예방(모든 자원을 한 번에 획득), 회피(은행원 알고리즘), 탐지 및 복구(타임아웃 설정, 트랜잭션 롤백), 락 순서 정의 등이 있습니다.',
    explanation:
      '락은 데이터의 일관성을 위해 동시 접근을 제어하는 도구입니다. 하지만 잘못 사용하면 데드락에 빠져 시스템이 멈출 수 있습니다. 데드락의 4가지 필요조건 중 하나만 제거해도 데드락을 방지할 수 있으며, 실무에서는 주로 타임아웃이나 락 획득 순서를 정하는 방식으로 해결합니다.',
    difficulty: 5,
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
    explanation:
      'B+tree의 핵심 특징은 모든 실제 데이터(레코드 포인터)가 리프 노드에만 저장되고, 내부 노드는 인덱스 키 역할만 한다는 것입니다. 또한 리프 노드끼리는 연결 리스트로 연결되어 순차 검색이 효율적입니다. B-tree와 달리 내부 노드에 데이터가 없어 트리의 높이를 낮출 수 있습니다.',
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
    explanation:
      'B+tree는 균형 트리 구조이므로 트리의 높이에 비례하는 검색 시간을 가집니다. 자식 노드의 수가 많으므로(M-way) 이진 트리보다 높이가 낮아 검색 효율이 좋으며, 시간 복잡도는 O(log n)입니다.',
    difficulty: 3,
    categoryPath: ['DB', 'B+tree'],
  },
  {
    questionType: 'short',
    content: 'B+tree와 B-tree의 가장 큰 차이는?',
    correctAnswer: '데이터 저장 위치 (B+tree는 리프 노드에만)',
    explanation:
      'B-tree는 모든 노드에 데이터가 저장될 수 있지만, B+tree는 오직 리프 노드에만 데이터가 저장되고 내부 노드는 라우팅을 위한 키만 저장합니다. 또한 B+tree는 리프 노드 간에 링크드 리스트가 있어 범위 검색(Range Scan)에 훨씬 유리합니다.',
    difficulty: 4,
    categoryPath: ['DB', 'B+tree'],
  },
  {
    questionType: 'short',
    content: 'B+tree가 DB 인덱스로 많이 사용되는 이유는?',
    correctAnswer: '균형 유지, 범위 검색 효율, 디스크 I/O 최소화',
    explanation:
      'B+tree는 데이터의 삽입/삭제에도 항상 균형을 유지하여 안정적인 성능을 제공합니다. 특히 리프 노드의 연결 구조 덕분에 범위 검색이 매우 빠르며, 한 노드(페이지)에 많은 키를 담을 수 있어 디스크 접근 횟수를 줄이는 데 최적화되어 있습니다.',
    difficulty: 3,
    categoryPath: ['DB', 'B+tree'],
  },
  {
    questionType: 'essay',
    content: 'B+tree의 삽입 알고리즘을 설명하고, split 과정을 서술하세요.',
    correctAnswer:
      'B+tree 삽입 시 먼저 적절한 리프 노드를 찾아 키를 추가합니다. 리프 노드가 최대 키 개수를 초과하면 split이 발생합니다. Split 시 중간 키를 기준으로 노드를 둘로 나누고, 중간 키를 부모 노드로 올립니다. 부모 노드도 오버플로우되면 재귀적으로 split을 수행하며, 루트 노드가 split되면 새로운 루트를 생성하여 트리의 높이가 1 증가합니다. 리프 노드는 데이터와 함께 형제 노드로의 포인터도 유지해야 합니다.',
    explanation:
      '삽입 과정의 핵심은 노드가 꽉 찼을 때 분할(split)하여 위로 올려보내는(promote) 것입니다. 이 과정이 재귀적으로 루트까지 이어질 수 있으며, 유일하게 트리의 높이가 증가하는 시점은 루트 노드가 분할될 때입니다. 이를 통해 트리의 균형을 항상 유지합니다.',
    difficulty: 5,
    categoryPath: ['DB', 'B+tree'],
  },
  {
    questionType: 'essay',
    content: 'B+tree의 삭제 알고리즘을 설명하고, underflow 처리 방법을 서술하세요.',
    correctAnswer:
      'B+tree 삭제 시 리프 노드에서 키를 제거합니다. 노드의 키 개수가 최소값 미만으로 떨어지면 underflow가 발생합니다. 이때 형제 노드에서 키를 빌려오는 redistribution을 시도하고, 불가능하면 형제 노드와 merge합니다. Merge 시 부모 노드의 키도 함께 내려오며, 부모에서도 underflow가 발생하면 재귀적으로 처리합니다. 루트까지 merge되면 트리의 높이가 1 감소합니다.',
    explanation:
      '삭제는 삽입의 역과정으로, 노드가 너무 비었을 때(underflow) 형제 노드와 합치거나(merge) 빌려오는(redistribution) 과정을 통해 균형을 맞춥니다. 트리의 높이가 줄어드는 유일한 경우는 루트 노드의 자식이 하나가 되어 루트가 사라질 때입니다.',
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
    explanation:
      'B+tree의 삽입/삭제 연산은 트리의 높이에 비례하는 O(log n) 시간이 소요됩니다. O(1)은 해시 테이블 같은 구조의 특징입니다.',
    difficulty: 3,
    categoryPath: ['DB', 'B+tree'],
  },
  {
    questionType: 'short',
    content: 'B+tree의 order란?',
    correctAnswer: '노드가 가질 수 있는 최대 자식 수',
    explanation:
      'Order(차수)는 B+tree 노드가 가질 수 있는 최대 자식 포인터의 개수를 의미합니다. Order가 m인 B+tree 노드는 최대 m-1개의 키를 가질 수 있습니다.',
    difficulty: 3,
    categoryPath: ['DB', 'B+tree'],
  },
  {
    questionType: 'essay',
    content:
      'B+tree와 해시 테이블을 비교하고, 각각 어떤 상황에서 사용하는 것이 적합한지 설명하세요.',
    correctAnswer:
      'B+tree는 O(log n) 검색 시간을 가지며 범위 검색과 정렬된 순회가 가능합니다. 해시 테이블은 O(1) 평균 검색 시간을 가지지만 범위 검색이 불가능합니다. B+tree는 범위 검색이 필요한 경우(예: 날짜 범위, 가격 범위), 정렬된 데이터가 필요한 경우, 부분 일치 검색이 필요한 경우에 적합합니다. 해시 테이블은 정확한 일치 검색만 필요하고 최대한 빠른 검색이 중요한 경우에 적합합니다. 데이터베이스 인덱스는 대부분 B+tree를 사용하는데, 이는 다양한 쿼리 패턴을 지원해야 하기 때문입니다.',
    explanation:
      'B+tree는 "범용성"이 뛰어나고(정렬, 범위 검색 가능), 해시 테이블은 "특정 목적(Exact Match)"에 매우 빠릅니다. DB는 다양한 형태의 질의를 처리해야 하므로 기본 인덱스로 B+tree를 선호합니다.',
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
    explanation:
      '해시 테이블은 키를 해시 함수에 통과시켜 주소를 바로 계산하므로, 충돌이 적다면 평균적으로 O(1)의 매우 빠른 검색 속도를 가집니다.',
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
    explanation:
      'Binary Search(이진 탐색)는 정렬된 배열에서 사용하는 탐색 알고리즘이며, 해시 충돌 해결 기법과는 관련이 없습니다. 나머지는 모두 충돌 해결 기법입니다.',
    difficulty: 3,
    categoryPath: ['DB', 'Hashing'],
  },
  {
    questionType: 'short',
    content: 'Chaining 방식이란?',
    correctAnswer: '충돌 시 연결 리스트로 관리',
    explanation:
      'Chaining은 해시 테이블의 각 버킷에 연결 리스트(Linked List)를 할당하여, 충돌이 발생하면 해당 버킷의 리스트에 데이터를 추가하는 방식입니다. 무한정 저장이 가능하지만 추가 메모리가 필요합니다.',
    difficulty: 3,
    categoryPath: ['DB', 'Hashing'],
  },
  {
    questionType: 'short',
    content: 'Open Addressing 방식이란?',
    correctAnswer: '충돌 시 다른 빈 버킷 탐색',
    explanation:
      'Open Addressing(개방 주소법)은 충돌 발생 시 해시 테이블 내의 다른 빈 공간을 찾아 데이터를 저장하는 방식입니다. Linear Probing, Quadratic Probing 등이 있습니다.',
    difficulty: 3,
    categoryPath: ['DB', 'Hashing'],
  },
  {
    questionType: 'essay',
    content:
      '좋은 해시 함수의 조건을 설명하고, 해시 테이블의 Load Factor가 성능에 미치는 영향을 서술하세요.',
    correctAnswer:
      '좋은 해시 함수는 첫째, 계산이 빠르고 간단해야 하며, 둘째, 키들을 해시 테이블 전체에 균등하게 분산시켜야 합니다(uniform distribution). 셋째, 충돌을 최소화해야 합니다. Load Factor는 테이블 크기 대비 저장된 키의 비율로, 값이 높아질수록 충돌 확률이 증가하여 성능이 저하됩니다. Chaining의 경우 Load Factor가 1을 초과해도 동작하지만 검색 시간이 O(n)에 가까워지고, Open Addressing은 Load Factor가 높아지면 빈 슬롯 찾기가 어려워져 성능이 급격히 저하됩니다. 일반적으로 Load Factor가 0.7-0.75를 넘으면 테이블 크기를 늘리는 rehashing을 수행합니다.',
    explanation:
      '해시 함수의 품질과 Load Factor 관리는 해시 테이블 성능의 핵심입니다. 데이터가 한쪽에 쏠리면(Clustering) O(n)으로 성능이 떨어지므로, 균등 분포와 적절한 테이블 확장이 필수적입니다.',
    difficulty: 5,
    categoryPath: ['DB', 'Hashing'],
  },
  {
    questionType: 'essay',
    content: '데이터베이스에서 해시 인덱스와 B+tree 인덱스를 비교하고, 각각의 장단점을 설명하세요.',
    correctAnswer:
      '해시 인덱스는 등호(=) 검색에서 O(1)의 매우 빠른 성능을 제공하지만, 범위 검색이나 정렬된 순서 접근이 불가능합니다. 또한 해시 충돌과 Load Factor 관리가 필요하며, 동적 크기 조정 시 rehashing 비용이 큽니다. B+tree 인덱스는 O(log n) 성능으로 약간 느리지만, 범위 검색과 정렬된 순회가 가능하고, 부분 일치 검색(LIKE)도 지원합니다. 또한 균형 잡힌 구조로 최악의 경우에도 안정적인 성능을 보장합니다. 따라서 등호 검색만 필요한 경우 해시 인덱스가, 다양한 검색 패턴이 필요한 경우 B+tree 인덱스가 적합합니다.',
    explanation:
      '해시 인덱스는 "정확한 일치"에 특화되어 있고, B+tree 인덱스는 "범위 및 정렬"까지 커버하는 범용 인덱스입니다. SQL의 유연함을 뒷받침하기 위해 대부분의 RDBMS는 B+tree를 기본으로 채택합니다.',
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
    explanation:
      'Double Hashing(이중 해싱)은 Open Addressing에서 충돌 발생 시, 두 번째 해시 함수를 사용하여 다음 탐사 위치의 간격(step size)을 결정하는 방법입니다. 이를 통해 클러스터링 문제를 완화할 수 있습니다.',
    difficulty: 4,
    categoryPath: ['DB', 'Hashing'],
  },
  {
    questionType: 'short',
    content: 'Linear Probing의 단점은?',
    correctAnswer: 'Primary Clustering 발생',
    explanation:
      'Linear Probing은 충돌 시 고정폭으로 다음 칸을 확인하므로, 데이터가 연속된 덩어리(Cluster)를 형성하는 경향이 있습니다. 이를 Primary Clustering이라 하며, 검색 시간이 늘어나는 원인이 됩니다.',
    difficulty: 4,
    categoryPath: ['DB', 'Hashing'],
  },
  {
    questionType: 'essay',
    content: 'Consistent Hashing이 무엇인지 설명하고, 분산 시스템에서 왜 중요한지 서술하세요.',
    correctAnswer:
      'Consistent Hashing은 해시 테이블을 원형 링 구조로 구성하여 노드를 추가하거나 제거할 때 최소한의 키만 재배치하는 해싱 기법입니다. 일반적인 해싱은 노드 개수가 변경되면 대부분의 키가 재배치되어야 하지만(전체 키의 k/n), Consistent Hashing은 평균적으로 k/n개의 키만 재배치됩니다(n은 노드 수). 분산 캐시, 로드 밸런서, 분산 데이터베이스에서 노드를 동적으로 추가/제거해야 하는 경우 필수적입니다. Virtual Node 개념을 도입하여 부하 분산을 더욱 균등하게 할 수 있습니다. Redis Cluster, Cassandra, DynamoDB 등에서 활용됩니다.',
    explanation:
      '일반적인 mod N 해싱은 N이 바뀌면 모든 결과가 바뀌어 캐시가 무효화되지만, Consistent Hashing은 링 구조를 사용하여 변화를 국소화합니다. 이는 서버 증설/장애 시 데이터 이동을 최소화해야 하는 대규모 분산 시스템의 핵심 기술입니다.',
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
    explanation:
      'Quick Sort는 분할 정복 알고리즘으로 평균적으로 O(n log n)의 성능을 보입니다. 하지만 피벗 선택이 최악인 경우 O(n^2)이 될 수 있습니다.',
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
    explanation:
      'Quick Sort는 원소들이 멀리 떨어진 위치로 이동할 수 있어 기존의 순서가 보장되지 않는 불안정 정렬(Unstable Sort)입니다.',
    difficulty: 3,
    categoryPath: ['DB', 'Sorting'],
  },
  {
    questionType: 'short',
    content: '안정 정렬(Stable Sort)이란?',
    correctAnswer: '같은 값의 상대적 순서 유지',
    explanation:
      '정렬 대상 중 같은 값을 가진 원소들이 정렬 전의 순서를 정렬 후에도 그대로 유지하는 것을 의미합니다. 다중 정렬 조건에서 중요합니다.',
    difficulty: 2,
    categoryPath: ['DB', 'Sorting'],
  },
  {
    questionType: 'short',
    content: '외부 정렬(External Sort)이 필요한 이유는?',
    correctAnswer: '메모리보다 큰 데이터 정렬',
    explanation:
      'RAM에 한 번에 올릴 수 없는 대용량 데이터를 정렬해야 할 때, 디스크를 보조 기억장치로 활용하여 정렬을 수행하기 위해 필요합니다. Merge Sort 방식이 주로 사용됩니다.',
    difficulty: 4,
    categoryPath: ['DB', 'Sorting'],
  },
  {
    questionType: 'essay',
    content: 'Merge Sort의 동작 원리를 설명하고, 시간 복잡도를 분석하세요.',
    correctAnswer:
      'Merge Sort는 분할 정복(Divide and Conquer) 알고리즘입니다. 배열을 재귀적으로 반으로 나누어 크기가 1이 될 때까지 분할한 후, 두 개의 정렬된 부분 배열을 병합하면서 전체를 정렬합니다. 병합 과정에서 두 배열의 앞에서부터 비교하며 작은 값을 결과 배열에 추가합니다. 분할 단계는 log n 레벨이며, 각 레벨에서 병합에 O(n) 시간이 소요되므로 전체 시간 복잡도는 O(n log n)입니다. 최선, 평균, 최악 모두 O(n log n)으로 일정하며, 안정 정렬이라는 장점이 있습니다. 단점은 O(n)의 추가 공간이 필요하다는 것입니다.',
    explanation:
      'Merge Sort는 "일단 쪼개고, 합치면서 정렬한다"는 원칙을 따릅니다. 항상 절반으로 나누므로 성능이 데이터 분포에 영향을 받지 않고 일정하지만, 별도의 메모리 공간이 필요하다는 비용이 있습니다.',
    difficulty: 4,
    categoryPath: ['DB', 'Sorting'],
  },
  {
    questionType: 'essay',
    content: 'Quick Sort의 동작 원리를 설명하고, 최악의 경우를 피하는 방법을 서술하세요.',
    correctAnswer:
      'Quick Sort는 pivot을 선택하여 pivot보다 작은 값은 왼쪽, 큰 값은 오른쪽으로 분할한 후 재귀적으로 정렬하는 알고리즘입니다. 평균적으로 O(n log n)의 빠른 성능을 보이지만, pivot 선택이 나쁘면 O(n^2)까지 느려질 수 있습니다. 최악의 경우를 피하기 위한 방법으로는 첫째, 랜덤하게 pivot을 선택하거나, 둘째, median-of-three 방식으로 첫 번째, 중간, 마지막 원소의 중간값을 pivot으로 선택하는 방법이 있습니다. 또한 작은 부분 배열에서는 Insertion Sort로 전환하여 성능을 개선할 수 있습니다. Quick Sort는 제자리 정렬(in-place)로 추가 메모리가 적게 필요하지만 불안정 정렬입니다.',
    explanation:
      'Quick Sort는 피벗(Pivot) 선택이 핵심입니다. 이미 정렬된 배열에서 첫 번째 원소를 피벗으로 잡으면 최악의 성능이 나옵니다. 랜덤 피벗이나 Median-of-3 전략을 통해 확률적으로 O(n log n)을 보장하려 합니다.',
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
    explanation:
      'Heap Sort는 힙 자료구조를 구성하는 데 O(n), 각 원소를 꺼내 정렬하는 데 O(n log n)이 소요되어 전체적으로 O(n log n)의 시간 복잡도를 가집니다.',
    difficulty: 3,
    categoryPath: ['DB', 'Sorting'],
  },
  {
    questionType: 'short',
    content: 'Radix Sort의 시간 복잡도는?',
    correctAnswer: 'O(d*n) (d는 자릿수)',
    explanation:
      'Radix Sort(기수 정렬)는 비교 연산을 수행하지 않고 자릿수별로 버킷에 담아 정렬합니다. 데이터 개수 n과 최대 자릿수 d에 비례하는 선형 시간 복잡도를 가집니다.',
    difficulty: 4,
    categoryPath: ['DB', 'Sorting'],
  },
  {
    questionType: 'essay',
    content: 'Counting Sort의 동작 원리와 제약 조건, 그리고 적합한 사용 사례를 설명하세요.',
    correctAnswer:
      'Counting Sort는 비교 기반이 아닌 정렬 알고리즘으로, 각 값의 출현 횟수를 세어 정렬합니다. 0부터 k까지의 값 범위에서 각 값의 개수를 카운트 배열에 저장하고, 누적합을 계산한 후 원소를 적절한 위치에 배치합니다. 시간 복잡도는 O(n+k)로 매우 빠르지만, k가 n보다 매우 크면 비효율적입니다. 제약 조건은 정수나 정수로 표현 가능한 데이터만 정렬 가능하고, 값의 범위가 제한적이어야 합니다. O(k)의 추가 공간이 필요하며 안정 정렬입니다. 적합한 사례는 나이, 학년, 점수 등 작은 범위의 정수 데이터를 정렬할 때입니다. Radix Sort의 기반 알고리즘으로도 사용됩니다.',
    explanation:
      'Counting Sort는 값의 분포를 미리 파악(Count)하여 위치를 결정합니다. 값의 범위가 작을 때는 가장 빠르지만, 범위가 넓으면(예: 0과 10억) 메모리 낭비가 심해 사용할 수 없습니다.',
    difficulty: 4,
    categoryPath: ['DB', 'Sorting'],
  },
  {
    questionType: 'essay',
    content:
      '데이터베이스 격리 수준(Isolation Level)의 4가지 레벨을 설명하고, 각 레벨에서 발생할 수 있는 문제점을 서술하세요.',
    correctAnswer:
      '격리 수준은 트랜잭션 간 격리 정도를 정의합니다. Read Uncommitted는 커밋되지 않은 데이터를 읽을 수 있어 Dirty Read가 발생합니다. Read Committed는 커밋된 데이터만 읽지만, Non-Repeatable Read(한 트랜잭션 내에서 같은 쿼리의 결과가 달라짐)가 발생할 수 있습니다. Repeatable Read는 같은 쿼리의 결과를 보장하지만 Phantom Read(새로운 행이 추가되거나 삭제됨)가 발생할 수 있습니다. Serializable은 완전한 격리를 보장하여 모든 문제를 방지하지만 성능이 가장 낮습니다. MySQL InnoDB는 기본적으로 Repeatable Read를 사용하며, MVCC(Multi-Version Concurrency Control)로 Phantom Read도 대부분 방지합니다.',
    explanation:
      '격리 수준은 성능과 데이터 일관성 사이의 트레이드오프입니다. 레벨이 낮으면 동시성은 좋지만 데이터 정합성 문제가 생기고, 높으면 정합성은 좋지만 성능이 떨어집니다.',
    difficulty: 5,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content: '데이터베이스 샤딩(Sharding)의 개념과 샤딩 전략을 설명하고, 장단점을 서술하세요.',
    correctAnswer:
      '샤딩은 데이터를 여러 데이터베이스 서버에 수평 분할하여 저장하는 기법입니다. 주요 샤딩 전략으로는 범위 기반 샤딩(Range-based: ID 1-1000은 샤드1, 1001-2000은 샤드2), 해시 기반 샤딩(Hash-based: 해시 함수로 샤드 결정), 지리 기반 샤딩(Geographic: 지역별 분산), 디렉토리 기반 샤딩(Directory-based: 룩업 테이블 사용)이 있습니다. 장점은 수평 확장으로 용량과 처리량을 늘릴 수 있고, 쿼리 성능이 향상되며, 장애 격리가 가능합니다. 단점은 구조가 복잡해지고, 샤드 간 조인이 어려우며, 리샤딩 비용이 크고, 데이터 불균형이 발생할 수 있습니다.',
    explanation:
      '샤딩은 "나눠서 저장한다"는 단순한 개념이지만, 데이터 분배 기준(Sharding Key)을 어떻게 잡느냐에 따라 성능과 관리 난이도가 천차만별입니다. 잘못된 키 선정은 데이터 쏠림(Hotspot)을 유발할 수 있습니다.',
    difficulty: 5,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content:
      '데이터베이스 복제(Replication)의 Master-Slave 구조를 설명하고, 동기 복제와 비동기 복제의 차이를 서술하세요.',
    correctAnswer:
      'Master-Slave 복제는 마스터 DB가 쓰기를 처리하고 슬레이브 DB가 읽기를 처리하는 구조입니다. 마스터의 변경 사항이 슬레이브로 복제되어 데이터 일관성을 유지합니다. 동기 복제는 마스터가 슬레이브의 복제 완료를 기다린 후 커밋하므로 데이터 일관성이 강하지만 성능이 저하됩니다. 네트워크 지연이나 슬레이브 장애 시 마스터 성능에 영향을 줍니다. 비동기 복제는 마스터가 커밋 후 즉시 응답하고 백그라운드로 복제하므로 성능이 좋지만, 마스터 장애 시 일부 데이터 손실 가능성이 있습니다. 실무에서는 준동기 복제(Semi-sync)를 사용하여 적어도 하나의 슬레이브에 복제된 후 커밋하는 절충안을 선택하기도 합니다.',
    explanation:
      '복제는 데이터 안정성과 읽기 성능 향상을 위해 사용됩니다. 동기는 안전하지만 느리고, 비동기는 빠르지만 데이터 유실 위험이 있습니다. 서비스의 요구사항(RPO, RTO)에 맞춰 선택합니다.',
    difficulty: 5,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content: 'MVCC(Multi-Version Concurrency Control)의 동작 원리와 장점을 설명하세요.',
    correctAnswer:
      'MVCC는 각 트랜잭션이 데이터의 특정 버전(스냅샷)을 보는 동시성 제어 기법입니다. 데이터를 변경할 때 기존 데이터를 덮어쓰지 않고 새로운 버전을 생성합니다. 각 행에는 트랜잭션 ID가 저장되며, 트랜잭션은 자신의 시작 시점에 커밋된 데이터만 볼 수 있습니다. 읽기 작업은 스냅샷을 읽고, 쓰기 작업은 새 버전을 생성하므로 읽기와 쓰기가 서로 블로킹하지 않습니다. 장점은 읽기 성능이 뛰어나고(락 불필요), 동시성이 높으며, 일관된 읽기를 제공합니다. 단점은 오래된 버전을 정리하는 Vacuum 작업이 필요하고 추가 저장 공간이 필요합니다. PostgreSQL, MySQL InnoDB, Oracle 등이 MVCC를 사용합니다.',
    explanation:
      'MVCC는 "락을 걸지 않고도 일관된 읽기를 보장한다"는 것이 핵심입니다. 과거 데이터를 보관하고 있어, 쓰기 작업 중에도 다른 사용자는 이전 데이터를 읽을 수 있습니다.',
    difficulty: 5,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content: 'NoSQL과 RDBMS를 비교하고, 각각 어떤 상황에서 사용하는 것이 적합한지 설명하세요.',
    correctAnswer:
      'RDBMS는 정형화된 스키마, ACID 트랜잭션, SQL 쿼리, 정규화된 데이터 구조를 특징으로 합니다. 복잡한 조인과 관계형 데이터 처리에 강하지만 수평 확장이 어렵습니다. NoSQL은 유연한 스키마, 수평 확장성, 높은 처리량을 특징으로 하며 Document(MongoDB), Key-Value(Redis), Column-family(Cassandra), Graph(Neo4j) 등 다양한 유형이 있습니다. RDBMS는 금융 시스템, ERP, 복잡한 트랜잭션이 필요한 경우에 적합합니다. NoSQL은 대용량 분산 데이터, 빠른 읽기/쓰기, 스키마 변경이 잦은 경우, 비정형 데이터 처리에 적합합니다. 실무에서는 Polyglot Persistence로 용도에 따라 혼용하는 추세입니다.',
    explanation:
      'RDBMS는 "데이터 무결성과 관계"가 중요할 때, NoSQL은 "확장성과 유연성, 속도"가 중요할 때 선택합니다. 최근에는 두 기술의 장점을 융합하는 시도도 많습니다.',
    difficulty: 4,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content:
      '데이터베이스 파티셔닝(Partitioning)의 개념과 종류를 설명하고, 샤딩과의 차이점을 서술하세요.',
    correctAnswer:
      '파티셔닝은 대용량 테이블을 작은 단위로 분할하여 관리하는 기법입니다. 수평 파티셔닝(Horizontal)은 행 단위로 분할하며, 범위(Range), 리스트(List), 해시(Hash), 복합(Composite) 파티셔닝이 있습니다. 수직 파티셔닝(Vertical)은 컬럼 단위로 분할하여 자주 사용하는 컬럼과 그렇지 않은 컬럼을 분리합니다. 장점은 쿼리 성능 향상(파티션 프루닝), 관리 용이성(파티션별 백업/복구), 병렬 처리 가능입니다. 샤딩과의 차이점은 파티셔닝은 논리적으로는 하나의 테이블이며 같은 DB 서버 내에서 이루어지지만, 샤딩은 물리적으로 여러 DB 서버에 분산된다는 점입니다. 파티셔닝은 단일 서버 내 성능 최적화, 샤딩은 수평 확장을 위해 사용됩니다.',
    explanation:
      '파티셔닝은 하나의 DB 안에서 테이블을 쪼개는 것이고, 샤딩은 여러 DB 서버로 쪼개는 것입니다. 파티셔닝은 관리 편의성과 쿼리 성능(Scanning 범위 축소)에 목적이 있습니다.',
    difficulty: 5,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content: 'LSM Tree(Log-Structured Merge Tree)의 동작 원리와 B+tree와의 비교를 설명하세요.',
    correctAnswer:
      'LSM Tree는 쓰기 최적화 자료구조로, 메모리의 MemTable에 먼저 쓰고 일정 크기가 되면 디스크의 SSTable(Sorted String Table)로 플러시합니다. 여러 레벨의 SSTable이 있으며, 주기적으로 Compaction을 수행하여 병합하고 정리합니다. 읽기는 MemTable, 각 레벨의 SSTable을 순차적으로 확인하며 Bloom Filter로 최적화합니다. 쓰기는 순차적이어서 매우 빠르지만(O(1) amortized), 읽기는 여러 레벨을 확인해야 하므로 B+tree보다 느립니다. B+tree는 제자리 갱신(in-place update)으로 쓰기 시 랜덤 I/O가 발생하지만 읽기가 빠릅니다. LSM Tree는 쓰기가 많은 워크로드(로그, 시계열 데이터)에 적합하며 LevelDB, RocksDB, Cassandra 등에서 사용됩니다.',
    explanation:
      'LSM Tree는 쓰기를 Append-only로 처리하여 디스크 쓰기 성능을 극대화합니다. 대신 읽을 때는 여러 파일을 뒤져야 하므로 B+tree보다 느릴 수 있습니다. Write Heavy한 시스템에 적합합니다.',
    difficulty: 5,
    categoryPath: ['DB', 'B+tree'],
  },
  {
    questionType: 'essay',
    content: 'WAL(Write-Ahead Logging)의 개념과 데이터베이스 복구 과정에서의 역할을 설명하세요.',
    correctAnswer:
      'WAL은 데이터를 변경하기 전에 변경 내용을 로그에 먼저 기록하는 기법입니다. 트랜잭션이 커밋되면 로그를 디스크에 fsync하고, 실제 데이터 페이지는 나중에 백그라운드로 플러시합니다. 이를 통해 임의 I/O를 순차 I/O로 변환하여 성능을 향상시킵니다. 복구 과정에서는 Redo Log를 사용하여 커밋된 트랜잭션의 변경을 재적용하고, Undo Log로 커밋되지 않은 트랜잭션을 롤백합니다. Checkpoint를 주기적으로 생성하여 모든 더티 페이지를 플러시하고, 복구는 마지막 Checkpoint부터 시작합니다. WAL은 ACID의 Durability를 보장하며 크래시 복구를 가능하게 합니다. PostgreSQL, MySQL InnoDB 등 대부분의 DBMS가 WAL을 사용합니다.',
    explanation:
      'WAL은 "선 로그, 후 데이터" 원칙입니다. 시스템이 셧다운되더라도 로그만 남아있으면 데이터를 복구할 수 있다는 원리를 이용해 내구성을 보장합니다.',
    difficulty: 5,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content:
      '데이터베이스 인덱스의 Covering Index와 Composite Index의 개념과 효과적인 사용 방법을 설명하세요.',
    correctAnswer:
      'Covering Index는 쿼리에 필요한 모든 컬럼을 인덱스가 포함하여 테이블 접근 없이 인덱스만으로 쿼리를 처리하는 기법입니다. SELECT id, name FROM users WHERE email="x"에서 (email, id, name) 인덱스를 생성하면 테이블 조회 없이 인덱스 스캔만으로 해결됩니다. 장점은 I/O 감소로 성능이 크게 향상되지만, 인덱스 크기가 커지고 쓰기 성능이 저하될 수 있습니다. Composite Index는 여러 컬럼을 조합한 인덱스로, 컬럼 순서가 중요합니다. (A, B, C) 인덱스는 A, (A, B), (A, B, C) 조건에 사용 가능하지만 B, C 단독으로는 사용 불가합니다. 카디널리티가 높은(값의 종류가 많은) 컬럼을 앞에 배치하고, WHERE, JOIN, ORDER BY에 자주 사용되는 컬럼 조합을 고려하여 생성해야 합니다.',
    explanation:
      'Covering Index는 인덱스 자체에 필요한 데이터가 다 있어서 실제 테이블을 열어볼 필요가 없는 상태를 말합니다. Composite Index는 이 Covering Index를 만들기 위해 여러 컬럼을 묶은 인덱스입니다.',
    difficulty: 5,
    categoryPath: ['DB', 'SQL'],
  },
  {
    questionType: 'essay',
    content:
      'CAP 정리(CAP Theorem)를 설명하고, 분산 데이터베이스 시스템에서의 의미와 사례를 서술하세요.',
    correctAnswer:
      'CAP 정리는 분산 시스템에서 Consistency(일관성), Availability(가용성), Partition Tolerance(분할 내성) 세 가지 속성 중 최대 두 가지만 동시에 만족할 수 있다는 이론입니다. 네트워크 분할(Partition)은 불가피하므로 실제로는 CP 또는 AP 중 선택해야 합니다. CP 시스템(MongoDB, HBase, Redis Cluster)은 일관성을 보장하지만 분할 시 일부 노드가 응답하지 않을 수 있습니다. AP 시스템(Cassandra, DynamoDB, CouchDB)은 항상 응답하지만 최신 데이터가 아닐 수 있으며, Eventual Consistency로 최종 일관성을 보장합니다. 실무에서는 BASE(Basically Available, Soft state, Eventually consistent) 모델로 절충하거나, 중요도에 따라 일관성 수준을 조정합니다. 금융 거래는 CP, 소셜 미디어는 AP가 적합합니다.',
    explanation:
      'CAP 정리는 분산 시스템 설계의 나침반입니다. "모든 것을 다 가질 순 없다"는 것을 인정하고, 시스템의 목적에 따라 일관성을 포기할지(AP), 가용성을 포기할지(CP) 결정해야 합니다.',
    difficulty: 5,
    categoryPath: ['DB', 'Hashing'],
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
    explanation:
      'TCP 연결 수립 과정은 클라이언트의 요청(SYN), 서버의 수락 및 요청(SYN-ACK), 클라이언트의 수락(ACK) 3단계로 이루어집니다.',
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
    explanation:
      'TCP는 신뢰성 확보를 위한 흐름 제어, 혼잡 제어 등의 오버헤드가 있어 UDP보다 느립니다. UDP는 단순한 전송 방식을 사용하여 속도가 빠릅니다.',
    difficulty: 2,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'short',
    content: 'TCP 흐름 제어(Flow Control)의 목적은?',
    correctAnswer: '수신자 버퍼 오버플로우 방지',
    explanation:
      '흐름 제어는 송신자가 수신자의 처리 속도보다 빠르게 데이터를 보내지 않도록 조절하여 수신 버퍼가 넘치는 것을 막습니다.',
    difficulty: 3,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'short',
    content: 'TCP 혼잡 제어(Congestion Control)의 목적은?',
    correctAnswer: '네트워크 혼잡 방지',
    explanation:
      '혼잡 제어는 네트워크 내의 패킷 수가 과도하게 증가하여 혼잡해지는 것을 방지하기 위해 송신자가 전송 속도를 조절하는 기법입니다.',
    difficulty: 3,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'essay',
    content:
      'TCP의 3-way handshake와 4-way handshake를 각각 설명하고, 왜 연결 종료 시에는 4단계가 필요한지 서술하세요.',
    correctAnswer:
      '3-way handshake는 TCP 연결 수립 과정으로, 클라이언트가 SYN을 보내고, 서버가 SYN-ACK로 응답하며, 클라이언트가 ACK를 보내 연결이 수립됩니다. 4-way handshake는 연결 종료 과정으로, 클라이언트가 FIN을 보내고, 서버가 ACK로 응답한 후, 서버가 FIN을 보내고, 클라이언트가 ACK로 응답합니다. 연결 종료 시 4단계가 필요한 이유는 TCP가 전이중(Full-Duplex) 통신이기 때문입니다. 한쪽이 데이터 전송을 종료해도 상대방은 아직 보낼 데이터가 남아있을 수 있으므로, 양방향 연결을 각각 독립적으로 종료해야 합니다. 따라서 각 방향의 FIN과 ACK가 필요하여 총 4단계가 됩니다.',
    explanation:
      '연결할 때는 서로 준비만 되면 되므로 3단계면 충분하지만, 끊을 때는 서로 "더 이상 보낼 말이 없는지" 확인해야 하므로 4단계가 필요합니다. 한쪽이 FIN을 보내도 다른 쪽은 아직 보낼 데이터가 있을 수 있기 때문입니다(Half-Close).',
    difficulty: 4,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'essay',
    content: 'TCP의 재전송 메커니즘을 설명하고, Timeout과 Fast Retransmit의 차이를 서술하세요.',
    correctAnswer:
      'TCP는 신뢰성 있는 통신을 위해 ACK를 받지 못한 세그먼트를 재전송합니다. Timeout 기반 재전송은 RTT(Round Trip Time)를 기반으로 계산된 타이머가 만료되면 세그먼트를 재전송하는 방식입니다. RTO(Retransmission Timeout)는 동적으로 조정되며, 네트워크 상황에 따라 변합니다. Fast Retransmit은 3개의 중복 ACK를 받으면 타이머 만료를 기다리지 않고 즉시 재전송하는 방식입니다. 중복 ACK는 순서가 틀린 세그먼트가 도착했음을 의미하며, 이는 패킷 손실의 강력한 신호입니다. Fast Retransmit은 Timeout보다 빠르게 손실을 복구하여 처리량을 향상시킵니다. 두 메커니즘은 함께 사용되어 다양한 손실 시나리오에 대응합니다.',
    explanation:
      '재전송은 신뢰성의 핵심입니다. 마냥 기다리는 것(Timeout)보다 힌트(중복 ACK)를 얻어 빨리 다시 보내는 것(Fast Retransmit)이 성능에 훨씬 유리합니다.',
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
    explanation:
      'UDP는 데이터그램 단위로 전송하며 패킷의 순서를 보장하지 않습니다. 순서 보장이 필요하면 애플리케이션 계층에서 직접 구현해야 합니다.',
    difficulty: 2,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'short',
    content: 'TCP의 Sliding Window 기법의 목적은?',
    correctAnswer: '흐름 제어 및 파이프라이닝',
    explanation:
      'Sliding Window는 수신자의 확인 응답(ACK)을 기다리지 않고 윈도우 크기만큼 데이터를 연속적으로 전송하여 네트워크 효율(Throughput)을 높이는 기법입니다.',
    difficulty: 3,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'essay',
    content: 'TCP의 Slow Start와 Congestion Avoidance 알고리즘을 설명하세요.',
    correctAnswer:
      'Slow Start는 연결 초기에 혼잡 윈도우(cwnd)를 1 MSS로 시작하여 ACK를 받을 때마다 지수적으로 증가시키는 알고리즘입니다(1→2→4→8...). Slow Start Threshold(ssthresh)에 도달하면 Congestion Avoidance로 전환됩니다. Congestion Avoidance는 cwnd를 선형적으로 증가시켜(RTT마다 1 MSS) 네트워크 용량을 조심스럽게 탐색합니다. 패킷 손실이 감지되면(3 duplicate ACKs 또는 timeout) ssthresh를 cwnd의 절반으로 줄이고 Slow Start를 재시작합니다. Timeout 발생 시 cwnd를 1로 초기화하고, Fast Retransmit/Fast Recovery의 경우 cwnd를 ssthresh로 줄입니다. 이를 통해 네트워크 혼잡을 회피하면서 대역폭을 효율적으로 사용합니다.',
    explanation:
      'Slow Start는 이름과 달리 초기에 "지수적"으로 빨라지며, 임계점부터는 천천히(선형) 증가합니다. 네트워크 용량을 탐색하면서 혼잡을 유발하지 않기 위한 전략입니다.',
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
    explanation:
      '멱등성은 동일한 요청을 여러 번 보내도 결과가 같음을 의미합니다. GET, PUT, DELETE는 멱등하지만, POST는 요청마다 새로운 리소스를 생성하므로 결과가 달라질 수 있어 멱등하지 않습니다.',
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
    explanation:
      '3xx 상태 코드는 클라이언트가 요청을 완료하기 위해 추가적인 동작(리다이렉션 등)이 필요함을 나타냅니다. 2xx는 성공, 4xx는 클라이언트 오류, 5xx는 서버 오류입니다.',
    difficulty: 1,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'short',
    content: 'HTTP의 Stateless 특징이란?',
    correctAnswer: '서버가 이전 요청 정보 미저장',
    explanation:
      'HTTP는 각 요청이 독립적이며, 서버가 클라이언트의 이전 상태를 기억하지 않는 Stateless 프로토콜입니다. 상태 유지가 필요하면 쿠키나 세션 등을 사용해야 합니다.',
    difficulty: 2,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'short',
    content: 'GET과 POST의 가장 큰 차이는?',
    correctAnswer: 'GET은 조회/멱등성, POST는 생성/비멱등성',
    explanation:
      'GET은 데이터를 요청할 때 사용하며 URL에 파라미터가 노출되고 멱등합니다. POST는 데이터를 제출/생성할 때 사용하며 Body에 데이터를 담고 멱등하지 않습니다.',
    difficulty: 2,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'essay',
    content: 'HTTP/1.1과 HTTP/2의 주요 차이점을 설명하고, HTTP/2의 성능 개선 기법을 서술하세요.',
    correctAnswer:
      'HTTP/1.1은 텍스트 기반 프로토콜로 한 번에 하나의 요청만 처리할 수 있어 HOL(Head-of-Line) Blocking 문제가 발생합니다. HTTP/2는 이를 개선하기 위해 바이너리 프레이밍 계층을 도입하고, 다중화(Multiplexing)를 지원하여 하나의 연결에서 여러 요청을 동시에 처리합니다. 또한 서버 푸시(Server Push)로 클라이언트 요청 전에 필요한 리소스를 미리 전송하고, 헤더 압축(HPACK)으로 중복 헤더를 제거하여 대역폭을 절약합니다. 스트림 우선순위 지정으로 중요한 리소스를 먼저 전송할 수 있습니다. 이러한 개선으로 HTTP/2는 페이지 로딩 속도가 크게 향상되었습니다.',
    explanation:
      'HTTP/2는 "동시성"과 "효율성"에 초점을 맞췄습니다. 하나의 연결로 여러 요청을 동시에 처리(Multiplexing)하고, 헤더를 압축하여 전송량을 줄였습니다.',
    difficulty: 4,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'essay',
    content: 'HTTPS의 동작 원리를 설명하고, SSL/TLS 핸드셰이크 과정을 서술하세요.',
    correctAnswer:
      'HTTPS는 HTTP에 SSL/TLS 계층을 추가하여 데이터를 암호화하는 프로토콜입니다. SSL/TLS 핸드셰이크는 다음과 같이 진행됩니다. 1) 클라이언트가 Client Hello를 보내며 지원하는 암호화 방식을 전달합니다. 2) 서버가 Server Hello로 응답하며 사용할 암호화 방식을 선택하고 인증서를 전송합니다. 3) 클라이언트가 인증서를 검증하고, 공개키로 암호화한 pre-master secret을 서버에 전송합니다. 4) 양측이 pre-master secret으로 세션 키를 생성하고, Finished 메시지를 교환하여 핸드셰이크를 완료합니다. 이후 세션 키로 대칭키 암호화 통신을 진행합니다. HTTPS는 데이터 기밀성, 무결성, 서버 인증을 제공하여 중간자 공격을 방지합니다.',
    explanation:
      'HTTPS는 암호화를 통해 도청과 변조를 막습니다. 핸드셰이크 과정에서 비대칭키 암호화로 대칭키(세션키)를 안전하게 교환하고, 실제 통신은 속도가 빠른 대칭키 암호화를 사용합니다.',
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
    explanation:
      'HTTP/3는 TCP 대신 UDP 기반의 QUIC 프로토콜을 사용하여 연결 수립 속도를 높이고 HOL Blocking 문제를 해결했습니다.',
    difficulty: 4,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'short',
    content: 'REST API에서 리소스 생성에 사용하는 메서드는?',
    correctAnswer: 'POST',
    explanation:
      'REST 아키텍처에서 리소스 생성(Create)은 주로 POST 메서드를 사용합니다. 리소스 조회는 GET, 수정은 PUT/PATCH, 삭제는 DELETE를 사용합니다.',
    difficulty: 1,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'essay',
    content: 'HTTP 쿠키와 세션의 차이점을 설명하고, 각각의 장단점을 서술하세요.',
    correctAnswer:
      '쿠키는 클라이언트(브라우저)에 저장되는 작은 데이터 조각으로, 서버가 Set-Cookie 헤더로 전송하면 브라우저가 저장하고 이후 요청마다 자동으로 전송합니다. 세션은 서버에 저장되는 사용자 상태 정보로, 세션 ID만 쿠키로 클라이언트에 전달됩니다. 쿠키의 장점은 서버 부담이 없고 만료 시간 설정이 자유롭지만, 보안에 취약하고(XSS, CSRF) 크기 제한(4KB)이 있습니다. 세션의 장점은 민감한 정보를 서버에 저장하여 보안성이 높지만, 서버 메모리를 사용하고 다중 서버 환경에서 세션 동기화가 필요합니다. 실무에서는 JWT 같은 토큰 기반 인증이나 Redis 같은 외부 세션 스토어를 활용합니다.',
    explanation:
      '쿠키는 "클라이언트에", 세션은 "서버에" 저장한다는 점이 핵심입니다. 보안이 중요한 정보는 세션에, 중요하지 않은 설정 등은 쿠키에 저장하는 것이 일반적입니다.',
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
    explanation:
      'DNS는 주로 53번 포트를 사용합니다. 일반적인 쿼리는 UDP 53번을, 응답이 크거나 존 전송(Zone Transfer) 시에는 TCP 53번을 사용합니다.',
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
    explanation:
      'A 레코드는 도메인 이름을 IPv4 주소로 매핑합니다. AAAA 레코드는 IPv6 주소, CNAME은 별칭, MX는 메일 서버를 나타냅니다.',
    difficulty: 2,
    categoryPath: ['네트워크', 'DNS'],
  },
  {
    questionType: 'short',
    content: 'DNS의 주요 역할은?',
    correctAnswer: '도메인 이름을 IP 주소로 변환',
    explanation:
      'DNS는 사람이 기억하기 쉬운 도메인 이름(예: www.example.com)을 컴퓨터가 통신할 수 있는 IP 주소(예: 192.0.2.1)로 변환해주는 인터넷 전화번호부 역할을 합니다.',
    difficulty: 1,
    categoryPath: ['네트워크', 'DNS'],
  },
  {
    questionType: 'short',
    content: 'DNS 캐싱의 목적은?',
    correctAnswer: '응답 속도 향상 및 트래픽 감소',
    explanation:
      'DNS 쿼리 결과를 일정 시간(TTL) 동안 저장하여, 동일한 도메인에 대한 재요청 시 DNS 서버를 거치지 않고 빠르게 응답하고 네트워크 트래픽을 줄입니다.',
    difficulty: 2,
    categoryPath: ['네트워크', 'DNS'],
  },
  {
    questionType: 'essay',
    content:
      'DNS 쿼리의 두 가지 방식인 재귀적 쿼리(Recursive Query)와 반복적 쿼리(Iterative Query)를 비교 설명하세요.',
    correctAnswer:
      '재귀적 쿼리는 클라이언트가 DNS 리졸버에게 완전한 답변을 요청하는 방식입니다. 리졸버는 여러 DNS 서버에 쿼리를 보내 최종 IP 주소를 찾아 클라이언트에게 반환합니다. 클라이언트는 하나의 요청만 보내고 결과를 받으므로 편리하지만, 리졸버의 부담이 큽니다. 반복적 쿼리는 각 DNS 서버가 자신이 알고 있는 최선의 정보만 반환하는 방식입니다. 클라이언트(또는 리졸버)는 여러 서버에 순차적으로 쿼리를 보내며 답을 찾아갑니다. 일반적으로 클라이언트와 로컬 리졸버 간에는 재귀적 쿼리를, 리졸버와 다른 DNS 서버 간에는 반복적 쿼리를 사용합니다.',
    explanation:
      '재귀적 쿼리는 "답을 구해와!"라고 시키는 것이고, 반복적 쿼리는 "어디로 가면 알 수 있어?"라고 물어보는 방식입니다.',
    difficulty: 4,
    categoryPath: ['네트워크', 'DNS'],
  },
  {
    questionType: 'essay',
    content: 'DNS의 계층 구조를 설명하고, 도메인 이름 해석 과정을 단계별로 서술하세요.',
    correctAnswer:
      'DNS는 트리 구조의 계층적 시스템입니다. 최상위에 루트(Root) 서버가 있고, 그 아래 TLD(Top-Level Domain) 서버(.com, .org, .kr 등), 그리고 권한 있는(Authoritative) 네임 서버 순으로 구성됩니다. 도메인 이름 해석 과정은 다음과 같습니다. 1) 클라이언트가 www.example.com을 조회하면 로컬 리졸버에 재귀적 쿼리를 보냅니다. 2) 리졸버는 루트 서버에 쿼리하여 .com TLD 서버 주소를 받습니다. 3) .com TLD 서버에 쿼리하여 example.com의 권한 있는 네임 서버 주소를 받습니다. 4) 해당 네임 서버에 쿼리하여 최종 IP 주소를 받습니다. 5) 리졸버가 클라이언트에게 IP 주소를 반환하고, 각 단계의 결과를 TTL에 따라 캐싱합니다. 이 계층 구조는 전 세계적인 확장성과 분산 관리를 가능하게 합니다.',
    explanation:
      'DNS는 루트(.) -> TLD(.com) -> 도메인(example.com) 순으로 계층적으로 관리되어 전 세계의 수많은 도메인을 효율적으로 관리하고 검색할 수 있습니다.',
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
    explanation:
      'CNAME(Canonical Name)은 도메인 이름에 대한 별칭을 지정할 때 사용합니다. 예를 들어 www.example.com을 example.com으로 연결할 때 사용합니다.',
    difficulty: 2,
    categoryPath: ['네트워크', 'DNS'],
  },
  {
    questionType: 'short',
    content: 'DNS의 TTL(Time To Live)이란?',
    correctAnswer: 'DNS 레코드 캐시 유효 시간',
    explanation:
      'TTL은 DNS 레코드가 캐시 서버에 저장되어 유효한 시간을 의미합니다. TTL이 지나면 캐시는 만료되고 다시 원본 서버에 쿼리해야 합니다.',
    difficulty: 2,
    categoryPath: ['네트워크', 'DNS'],
  },
  {
    questionType: 'essay',
    content: 'DNS Amplification Attack이 무엇인지 설명하고, 방어 방법을 서술하세요.',
    correctAnswer:
      'DNS Amplification Attack은 DDoS 공격의 일종으로, 공격자가 DNS 서버를 이용해 소량의 요청으로 대량의 응답을 생성하여 피해자에게 전송하는 공격입니다. 공격자는 출발지 IP를 피해자 IP로 위조(IP Spoofing)하고 ANY 쿼리 같은 큰 응답을 유발하는 쿼리를 DNS 서버에 보냅니다. DNS 서버는 피해자에게 수십~수백 배 증폭된 응답을 보내 대역폭을 고갈시킵니다. 방어 방법으로는 첫째, Rate Limiting으로 특정 IP의 쿼리 속도를 제한하고, 둘째, Response Rate Limiting(RRL)으로 동일 응답의 반복을 제한하며, 셋째, ANY 쿼리를 차단하고, 넷째, BCP38(Best Current Practice 38)을 구현하여 ISP 레벨에서 IP Spoofing을 차단합니다. 또한 DNSSEC을 사용하여 DNS 보안을 강화할 수 있습니다.',
    explanation:
      'DNS 증폭 공격은 DNS 응답이 요청보다 훨씬 크다는 점과 UDP의 비연결성(소스 IP 위조 가능)을 악용한 공격입니다. 공개된 오픈 리졸버(Open Resolver)를 줄이고 소스 IP 검증을 강화해야 합니다.',
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
    explanation:
      '전송 계층은 OSI 모델의 4번째 계층으로, 종단 간(End-to-End) 신뢰성 있는 데이터 전송을 담당합니다. 대표적인 프로토콜은 TCP와 UDP입니다.',
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
    explanation:
      '라우터는 패킷의 IP 주소를 확인하여 최적의 경로를 설정하는 장비이므로, 네트워크 계층(Layer 3)에서 동작합니다.',
    difficulty: 2,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'short',
    content: 'OSI 7계층을 순서대로 나열하면?',
    correctAnswer: '물리-데이터링크-네트워크-전송-세션-표현-응용',
    explanation:
      '하위 계층부터 물리(L1), 데이터 링크(L2), 네트워크(L3), 전송(L4), 세션(L5), 표현(L6), 응용(L7) 계층입니다. "물데네전세표응" 등으로 암기하기도 합니다.',
    difficulty: 1,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'short',
    content: '데이터 링크 계층(Layer 2)의 주요 역할은?',
    correctAnswer: 'MAC 주소 기반 프레임 전달, 오류 검출',
    explanation:
      '데이터 링크 계층은 인접한 노드 간의 신뢰성 있는 전송을 담당합니다. MAC 주소를 사용하여 프레임을 전달하고, CRC 등을 통해 전송 오류를 검출합니다.',
    difficulty: 2,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'essay',
    content: 'OSI 7계층 모델과 TCP/IP 4계층 모델을 비교하고, 각 모델의 장단점을 설명하세요.',
    correctAnswer:
      'OSI 7계층 모델은 네트워크 통신을 7개의 논리적 계층으로 세분화한 이론적 모델입니다. 물리, 데이터 링크, 네트워크, 전송, 세션, 표현, 응용 계층으로 구성되며, 각 계층이 명확히 분리되어 교육과 표준화에 유용합니다. TCP/IP 4계층 모델은 실제 인터넷에서 사용되는 실용적 모델로, 네트워크 인터페이스, 인터넷, 전송, 응용 계층으로 구성됩니다. OSI의 세션, 표현, 응용 계층이 TCP/IP에서는 응용 계층으로 통합되었습니다. OSI 모델은 개념적으로 완성도가 높고 각 계층의 역할이 명확하지만 복잡하고 실제 구현과 차이가 있습니다. TCP/IP 모델은 실용적이고 간결하며 실제 인터넷 프로토콜과 일치하지만, 계층 분리가 덜 명확합니다. 현대 네트워크는 TCP/IP 모델을 따르지만, OSI 모델은 네트워크 개념 설명과 문제 진단에 여전히 활용됩니다.',
    explanation:
      'OSI는 이론적 표준(Reference Model)이고, TCP/IP는 실질적 표준(Implementation Model)입니다. TCP/IP가 인터넷의 표준이 되면서 OSI는 주로 교육 및 진단 목적으로 사용됩니다.',
    difficulty: 4,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'essay',
    content: '캡슐화(Encapsulation)와 역캡슐화(Decapsulation) 과정을 OSI 계층별로 설명하세요.',
    correctAnswer:
      '캡슐화는 송신 측에서 데이터가 상위 계층에서 하위 계층으로 내려가며 각 계층의 헤더(또는 트레일러)가 추가되는 과정입니다. 7계층(응용)에서 사용자 데이터가 생성되고, 6계층(표현)에서 데이터 형식 변환 및 암호화가 이루어집니다. 5계층(세션)에서 세션 정보가 추가되고, 4계층(전송)에서 TCP/UDP 헤더가 붙어 세그먼트가 됩니다. 3계층(네트워크)에서 IP 헤더가 추가되어 패킷이 되고, 2계층(데이터 링크)에서 MAC 헤더와 트레일러가 추가되어 프레임이 됩니다. 마지막으로 1계층(물리)에서 비트 스트림으로 변환되어 전송됩니다. 역캡슐화는 수신 측에서 하위 계층부터 순차적으로 헤더를 제거하며 데이터를 추출하는 과정으로, 각 계층에서 해당 계층의 헤더를 해석하고 제거한 후 상위 계층으로 전달합니다. 이 과정을 통해 계층 간 독립성이 유지되고 모듈화된 네트워크 구조가 가능해집니다.',
    explanation:
      '캡슐화는 편지를 보낼 때 내용을 봉투에 넣고 주소를 쓰는 것과 같습니다. 각 계층을 지날 때마다 해당 계층의 정보(헤더)가 덧붙여져 전송되고, 수신 측은 이를 역순으로 까보며 내용을 확인합니다.',
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
    explanation:
      '네트워크 계층은 논리적 주소인 IP 주소를 사용하여 경로를 찾습니다. MAC 주소는 2계층, Port 번호는 4계층, 도메인 이름은 7계층에서 주로 다룹니다.',
    difficulty: 1,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'short',
    content: '스위치(Switch)가 동작하는 OSI 계층은?',
    correctAnswer: '2계층 (데이터 링크)',
    explanation:
      '일반적인 L2 스위치는 MAC 주소를 기반으로 프레임을 전달하므로 데이터 링크 계층 장비입니다. 라우팅 기능이 있는 L3 스위치는 네트워크 계층에서도 동작합니다.',
    difficulty: 2,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'essay',
    content: '세션 계층(Layer 5)의 역할과 주요 프로토콜을 설명하세요.',
    correctAnswer:
      '세션 계층은 응용 프로그램 간의 대화(세션)를 설정, 관리, 종료하는 역할을 합니다. 데이터 교환의 경계와 동기화를 제공하며, 세션 복구 기능을 통해 통신 중단 시 재개 지점을 관리합니다. 주요 기능으로는 세션 수립 및 해제, 대화 제어(반이중/전이중), 동기화 포인트 설정, 토큰 관리 등이 있습니다. 대표적인 프로토콜로는 NetBIOS(네트워크 기본 입출력 시스템), RPC(Remote Procedure Call), PPTP(Point-to-Point Tunneling Protocol) 등이 있습니다. 실제로 TCP/IP 모델에서는 세션 계층이 응용 계층에 통합되어 있지만, 개념적으로 세션 관리는 여전히 중요한 기능입니다.',
    explanation:
      '세션 계층은 "대화의 관리자"입니다. 통신이 끊어졌을 때 어디서부터 다시 시작할지(동기화), 누가 말할 차례인지(대화 제어) 등을 관리합니다.',
    difficulty: 4,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'essay',
    content: 'NAT(Network Address Translation)의 동작 원리와 종류를 설명하고, 장단점을 서술하세요.',
    correctAnswer:
      'NAT는 사설 IP 주소를 공인 IP 주소로 변환하는 기술입니다. 라우터가 내부 네트워크의 사설 IP(예: 192.168.x.x)를 외부 통신 시 공인 IP로 변환하고 NAT 테이블에 매핑 정보를 저장합니다. 종류로는 Static NAT(1:1 고정 매핑), Dynamic NAT(풀에서 동적 할당), PAT/NAPT(포트 번호 활용한 다대일 매핑)가 있습니다. 장점은 IPv4 주소 고갈 문제 완화, 내부 네트워크 보안 강화(내부 IP 숨김), 네트워크 재구성 용이입니다. 단점은 End-to-End 연결성 저해, P2P 통신 어려움, NAT Traversal 필요, 성능 오버헤드, 일부 프로토콜 호환성 문제가 있습니다. IPv6의 보급으로 NAT의 필요성이 줄어들 것으로 예상되지만, 당분간은 광범위하게 사용될 전망입니다.',
    explanation:
      'NAT는 하나의 공인 IP로 여러 내부 기기가 인터넷을 쓸 수 있게 해줍니다(공유기 원리). 주소 부족 해결과 보안에 유용하지만, 외부에서 내부로 직접 접속하기 어렵게 만듭니다.',
    difficulty: 4,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'essay',
    content: 'QUIC 프로토콜의 특징과 TCP 대비 개선점을 설명하세요.',
    correctAnswer:
      'QUIC(Quick UDP Internet Connections)는 UDP 기반의 전송 계층 프로토콜로 HTTP/3에서 사용됩니다. TCP 대비 주요 개선점은 다음과 같습니다. 첫째, 0-RTT 연결 수립으로 초기 연결 시 핸드셰이크 지연을 제거하여 빠른 연결이 가능합니다. 둘째, 멀티플렉싱을 스트림 레벨에서 지원하여 TCP의 HOL Blocking 문제를 해결했습니다. 한 스트림의 패킷 손실이 다른 스트림에 영향을 주지 않습니다. 셋째, 연결 마이그레이션을 지원하여 IP 주소나 포트가 변경되어도(Wi-Fi↔LTE 전환) 연결이 유지됩니다. 넷째, 내장된 암호화(TLS 1.3 통합)로 보안이 강화되었습니다. 다섯째, 개선된 혼잡 제어와 손실 복구 알고리즘을 제공합니다. QUIC는 모바일 환경과 고지연 네트워크에서 특히 효과적입니다.',
    explanation:
      'QUIC는 "UDP 위에 TCP의 장점을 새로 구현"한 것입니다. TCP의 느린 연결과 HOL Blocking을 해결하기 위해 구글이 제안했고, HTTP/3의 기반이 되었습니다.',
    difficulty: 5,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'essay',
    content:
      'CORS(Cross-Origin Resource Sharing)의 개념과 동작 방식, 그리고 Preflight Request를 설명하세요.',
    correctAnswer:
      'CORS는 웹 브라우저에서 다른 출처(도메인, 프로토콜, 포트)의 리소스에 접근할 수 있도록 하는 메커니즘입니다. 동일 출처 정책(Same-Origin Policy)을 우회하기 위해 서버가 특정 출처의 요청을 허용하는지 HTTP 헤더로 명시합니다. Simple Request(GET, POST with simple content-type)는 바로 요청하고 Access-Control-Allow-Origin 헤더로 확인합니다. Preflight Request는 실제 요청 전에 OPTIONS 메서드로 서버에 허용 여부를 확인하는 과정입니다. PUT, DELETE, 커스텀 헤더 사용 시 발생하며, 서버는 Access-Control-Allow-Methods, Access-Control-Allow-Headers 등으로 응답합니다. 서버에서 올바른 CORS 헤더를 설정하지 않으면 브라우저가 응답을 차단하여 보안을 유지합니다.',
    explanation:
      '브라우저는 보안을 위해 다른 도메인의 리소스 접근을 기본적으로 막습니다(SOP). CORS는 이를 안전하게 풀어주기 위해 "이 도메인은 괜찮아"라고 서버가 허가증을 발급하는 방식입니다.',
    difficulty: 4,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'essay',
    content: 'CDN(Content Delivery Network)의 동작 원리와 성능 개선 효과를 설명하세요.',
    correctAnswer:
      'CDN은 전 세계에 분산된 서버 네트워크를 통해 콘텐츠를 사용자와 가까운 위치에서 제공하는 시스템입니다. 동작 원리는 다음과 같습니다. 오리진 서버의 콘텐츠를 여러 엣지 서버에 캐싱하고, DNS나 Anycast를 통해 사용자를 가장 가까운 엣지 서버로 라우팅합니다. 캐시 히트 시 엣지 서버가 즉시 응답하고, 캐시 미스 시 오리진 서버에서 가져와 캐싱 후 응답합니다. 성능 개선 효과는 첫째, 지리적 거리 단축으로 레이턴시가 감소하고, 둘째, 오리진 서버 부하가 분산되며, 셋째, 대역폭 비용이 절감되고, 넷째, DDoS 방어 등 보안이 강화됩니다. 정적 리소스(이미지, CSS, JS)뿐만 아니라 동적 콘텐츠 가속, 비디오 스트리밍에도 활용됩니다. Cloudflare, AWS CloudFront, Akamai 등이 대표적입니다.',
    explanation:
      'CDN은 사용자와 서버 사이의 물리적 거리를 줄여 속도를 높이는 기술입니다. "물류 센터"를 여러 곳에 두어 배송 시간을 줄이는 것과 같습니다.',
    difficulty: 4,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'essay',
    content: 'WebSocket의 동작 원리를 설명하고, HTTP 폴링 및 Server-Sent Events와 비교하세요.',
    correctAnswer:
      'WebSocket은 HTTP 업그레이드 핸드셰이크를 통해 양방향 전이중 통신 채널을 수립하는 프로토콜입니다. 클라이언트가 HTTP GET 요청에 Upgrade: websocket 헤더를 포함하여 보내면, 서버가 101 Switching Protocols로 응답하여 연결을 WebSocket으로 전환합니다. 이후 TCP 연결 위에서 프레임 기반의 양방향 메시지 교환이 가능하며 오버헤드가 매우 적습니다. HTTP 폴링은 클라이언트가 주기적으로 서버에 요청하여 업데이트를 확인하는 방식으로, 실시간성이 떨어지고 불필요한 요청이 많습니다. Long Polling은 서버가 이벤트 발생까지 응답을 보류하여 개선했지만 여전히 오버헤드가 큽니다. Server-Sent Events(SSE)는 HTTP 기반 서버→클라이언트 단방향 스트리밍으로, 구현이 간단하지만 클라이언트→서버 통신은 별도 HTTP 요청이 필요합니다. WebSocket은 실시간 채팅, 게임, 협업 도구 등 양방향 실시간 통신이 필요한 경우에 최적입니다.',
    explanation:
      'WebSocket은 전화 통화(실시간 양방향), Polling은 우편함 확인(주기적 확인), SSE는 라디오 방송(단방향 수신)에 비유할 수 있습니다. 실시간성이 중요한 양방향 앱에 적합합니다.',
    difficulty: 5,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'essay',
    content: 'ARP(Address Resolution Protocol)의 동작 원리와 ARP Spoofing 공격을 설명하세요.',
    correctAnswer:
      'ARP는 네트워크 계층의 IP 주소를 데이터 링크 계층의 MAC 주소로 변환하는 프로토콜입니다. 동작 과정은 다음과 같습니다. 호스트가 같은 서브넷의 IP로 통신하려면 MAC 주소가 필요하므로, ARP Request를 브로드캐스트로 전송합니다("IP 주소 X.X.X.X의 MAC 주소는?"). 해당 IP를 가진 호스트가 자신의 MAC 주소를 포함한 ARP Reply를 유니캐스트로 응답합니다. 송신자는 이 정보를 ARP 캐시에 저장하여 재사용합니다. ARP Spoofing은 공격자가 위조된 ARP Reply를 보내 피해자의 ARP 캐시를 오염시키는 중간자 공격입니다. 예를 들어 공격자가 게이트웨이의 IP에 자신의 MAC을 매핑시켜 모든 트래픽을 가로챌 수 있습니다. 방어 방법으로는 정적 ARP 테이블 사용, Dynamic ARP Inspection(DAI), 암호화(VPN, HTTPS) 등이 있습니다.',
    explanation:
      'ARP는 IP 주소만 알고 MAC 주소를 모를 때 사용합니다. "이 IP 쓰는 사람 누구야?"라고 방송(Broadcast)하면 주인이 손을 드는 식입니다. 이 대답을 위조하는 것이 ARP Spoofing입니다.',
    difficulty: 5,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'essay',
    content: 'VLAN(Virtual LAN)의 개념과 장점, 그리고 VLAN Tagging(802.1Q)을 설명하세요.',
    correctAnswer:
      'VLAN은 물리적 네트워크 구조와 무관하게 논리적으로 네트워크를 분할하는 기술입니다. 하나의 스위치에서 여러 개의 독립적인 브로드캐스트 도메인을 만들 수 있습니다. 장점은 첫째, 브로드캐스트 트래픽 감소로 성능이 향상되고, 둘째, 보안이 강화되며(부서별 격리), 셋째, 유연한 네트워크 관리가 가능하고(물리적 이동 없이 VLAN 변경), 넷째, 리소스 활용도가 향상됩니다. VLAN Tagging(IEEE 802.1Q)은 이더넷 프레임에 4바이트 VLAN 태그를 삽입하여 VLAN을 구분하는 방식입니다. 태그에는 12비트 VLAN ID(최대 4096개 VLAN), 3비트 우선순위, 1비트 CFI가 포함됩니다. Trunk 포트는 여러 VLAN의 태그된 프레임을 전달하고, Access 포트는 하나의 VLAN에만 속하며 태그를 제거합니다. Inter-VLAN 통신은 Layer 3 스위치나 라우터가 필요합니다.',
    explanation:
      'VLAN은 하나의 스위치를 여러 대의 가상 스위치처럼 쓰게 해줍니다. 부서가 달라도 같은 스위치에 꽂고 논리적으로 망을 분리할 수 있어 관리와 보안에 효율적입니다.',
    difficulty: 5,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'essay',
    content:
      'BGP(Border Gateway Protocol)의 역할과 AS(Autonomous System), 그리고 BGP Hijacking을 설명하세요.',
    correctAnswer:
      'BGP는 인터넷의 서로 다른 AS(자율 시스템) 간의 라우팅을 담당하는 경로 벡터 프로토콜입니다. AS는 하나의 관리 주체가 운영하는 IP 네트워크 그룹으로, AS 번호로 식별됩니다. BGP는 Path Vector 알고리즘을 사용하여 최적 경로를 선택하며, AS 경로, 정책, 비용 등을 고려합니다. eBGP는 AS 간 통신에, iBGP는 AS 내부 통신에 사용됩니다. BGP Hijacking은 공격자가 자신이 소유하지 않은 IP 프리픽스를 BGP로 광고하여 트래픽을 가로채는 공격입니다. 2008년 유튜브 사건처럼 잘못된 BGP 광고로 인터넷 트래픽이 잘못된 경로로 라우팅될 수 있습니다. 방어 방법으로는 RPKI(Resource Public Key Infrastructure), BGPsec, IRR 필터링 등이 있습니다. BGP의 신뢰 기반 설계로 인해 보안 취약점이 존재합니다.',
    explanation:
      'BGP는 인터넷 서비스 제공자(ISP)들끼리 "우리 길로 오면 어디로 갈 수 있어"라고 알려주는 프로토콜입니다. 인터넷 전체의 지도를 그리는 역할을 합니다.',
    difficulty: 5,
    categoryPath: ['네트워크', 'OSI 7계층'],
  },
  {
    questionType: 'essay',
    content: 'IPv4와 IPv6의 주요 차이점을 설명하고, IPv6 전환 기술을 서술하세요.',
    correctAnswer:
      'IPv4는 32비트 주소 체계로 약 43억 개의 주소를 제공하지만 고갈되었습니다. IPv6는 128비트로 사실상 무한한 주소 공간(2^128)을 제공합니다. 주요 차이점은 첫째, 주소 표기법이 다릅니다(IPv4: 192.168.1.1, IPv6: 2001:0db8::1). 둘째, IPv6는 헤더가 단순화되어 라우팅 효율이 향상되었습니다. 셋째, IPv6는 IPsec이 필수로 보안이 강화되었습니다. 넷째, NAT가 불필요하여 End-to-End 연결이 복원됩니다. 다섯째, Stateless Address Autoconfiguration(SLAAC)으로 자동 설정이 가능합니다. 전환 기술로는 Dual Stack(IPv4와 IPv6 동시 운영), Tunneling(6to4, 6in4로 IPv6 패킷을 IPv4로 캡슐화), Translation(NAT64로 프로토콜 변환)이 있습니다. 완전한 전환에는 시간이 걸리지만 IPv6 채택률은 꾸준히 증가하고 있습니다.',
    explanation:
      'IPv6는 IPv4의 주소 고갈 문제를 해결하고, 보안과 효율성을 개선한 차세대 프로토콜입니다. 엄청나게 많은 주소를 제공하여 모든 기기에 고유 IP를 부여할 수 있습니다.',
    difficulty: 4,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
  {
    questionType: 'essay',
    content: '로드 밸런싱의 알고리즘 종류와 Layer 4 vs Layer 7 로드 밸런싱의 차이를 설명하세요.',
    correctAnswer:
      '로드 밸런싱 알고리즘으로는 Round Robin(순차 분배), Least Connections(연결 수 최소), Weighted(가중치 부여), IP Hash(출발지 IP 해싱), Least Response Time(응답 시간 최소) 등이 있습니다. Layer 4 로드 밸런싱은 전송 계층에서 동작하여 IP 주소와 포트 번호만으로 라우팅합니다. TCP/UDP 헤더만 확인하므로 빠르지만 콘텐츠 기반 라우팅은 불가능합니다. 세션 유지를 위해 Source IP 해싱을 사용합니다. Layer 7 로드 밸런싱은 응용 계층에서 동작하여 HTTP 헤더, 쿠키, URL 경로 등 콘텐츠를 분석합니다. /api는 API 서버로, /static은 정적 서버로 라우팅하는 등 세밀한 제어가 가능하지만 성능 오버헤드가 있습니다. SSL 종료, 압축, 캐싱 등 추가 기능도 제공합니다. L4는 고성능이 중요한 경우, L7은 복잡한 라우팅 로직이 필요한 경우에 적합합니다.',
    explanation:
      'L4는 택배 상자의 "주소"만 보고 분류하는 것이고, L7은 상자를 "열어서 내용물"을 보고 분류하는 것입니다. L7이 더 똑똑하지만 작업이 더 많습니다.',
    difficulty: 5,
    categoryPath: ['네트워크', 'HTTP'],
  },
  {
    questionType: 'essay',
    content: 'SYN Flooding 공격의 원리와 방어 기법(SYN Cookie)을 설명하세요.',
    correctAnswer:
      'SYN Flooding은 TCP 3-way handshake의 취약점을 이용한 DDoS 공격입니다. 공격자가 대량의 SYN 패킷을 보내고 SYN-ACK에 응답하지 않아 서버의 연결 대기 큐(backlog)를 가득 채워 정상 사용자의 연결을 차단합니다. 각 Half-Open 연결은 타임아웃까지 리소스를 점유하므로 서버가 마비됩니다. SYN Cookie는 상태를 저장하지 않고 연결을 처리하는 방어 기법입니다. 서버가 SYN을 받으면 연결 정보를 저장하지 않고, 시퀀스 번호를 암호화된 쿠키로 생성하여 SYN-ACK를 보냅니다. 클라이언트가 ACK로 응답하면 쿠키를 검증하여 연결을 수립합니다. 이로써 메모리를 절약하고 공격을 무력화합니다. 다른 방어 방법으로는 backlog 크기 증가, 타임아웃 단축, Rate Limiting, 방화벽 필터링 등이 있습니다.',
    explanation:
      'SYN Flooding은 장난전화를 계속 걸어 통화중 상태로 만드는 것과 같습니다. SYN Cookie는 "진짜 통화할 거면 암호 대라"고 응답하여 장난전화를 걸러내는 방식입니다.',
    difficulty: 5,
    categoryPath: ['네트워크', 'TCP/IP'],
  },
];
