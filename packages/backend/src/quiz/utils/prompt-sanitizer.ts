/**
 * 프롬프트 인젝션 방어를 위한 입력 살균 유틸리티
 *
 * 방어 전략:
 * 1. 위험 패턴 감지 및 필터링
 * 2. 구분자 이스케이프
 * 3. 입력 정규화
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html
 * @see https://github.com/tldrsec/prompt-injection-defenses
 */

interface SanitizeResult {
  sanitized: string;
  flagged: boolean;
  flags: string[];
}

/**
 * 프롬프트 인젝션 감지 패턴
 * - 영어 및 한국어 패턴 모두 포함
 * - 대소문자 무시
 */
const INJECTION_PATTERNS: { pattern: RegExp; description: string }[] = [
  // 영어 인젝션 패턴
  { pattern: /ignore\s+(all\s+)?(previous|above|prior)/i, description: 'ignore instructions' },
  {
    pattern: /disregard\s+(all\s+)?(previous|above|prior)/i,
    description: 'disregard instructions',
  },
  { pattern: /forget\s+(all\s+)?(previous|above|prior)/i, description: 'forget instructions' },
  { pattern: /override\s+(all\s+)?(previous|above|prior)/i, description: 'override instructions' },
  { pattern: /new\s+instructions?:/i, description: 'new instructions' },
  { pattern: /system\s*prompt/i, description: 'system prompt reference' },
  { pattern: /you\s+are\s+now/i, description: 'role change attempt' },
  { pattern: /act\s+as\s+(if|a)/i, description: 'role change attempt' },
  { pattern: /pretend\s+(you|to)/i, description: 'role change attempt' },

  // 한국어 인젝션 패턴
  { pattern: /무시\s*(하|해|하고|해라)?/i, description: '무시 지시' },
  { pattern: /잊어\s*(버려|라)?/i, description: '잊어 지시' },
  { pattern: /정답\s*(처리|으로)?/i, description: '정답처리 지시' },
  { pattern: /만점\s*(처리|으로)?/i, description: '만점처리 지시' },
  { pattern: /무조건\s*(정답|맞|틀)?/i, description: '무조건 채점 지시' },
  { pattern: /점수\s*(를|을)?\s*(주|줘|줘라)/i, description: '점수 조작 지시' },
  { pattern: /채점\s*(하지|안|말)/i, description: '채점 회피 지시' },
  { pattern: /위\s*(내용|지시|명령)/i, description: '이전 지시 참조' },
  { pattern: /아래\s*(내용|지시|명령)/i, description: '지시 삽입 시도' },
  { pattern: /테스트\s*(이니|이므로|라서|니까)?/i, description: '테스트 우회 시도' },

  // 구분자 기반 인젝션 시도
  { pattern: /^-{3,}/m, description: '구분자 인젝션 (---)' },
  { pattern: /^#{3,}/m, description: '구분자 인젝션 (###)' },
  { pattern: /^`{3,}/m, description: '구분자 인젝션 (```)' },
  { pattern: /\[system\]/i, description: '시스템 태그 인젝션' },
  { pattern: /\[assistant\]/i, description: '어시스턴트 태그 인젝션' },
  { pattern: /<\/?system>/i, description: 'XML 시스템 태그 인젝션' },
  { pattern: /<\s*\/?\s*user_answer\s*>/i, description: 'USER_ANSWER 경계 탈출 시도' },
];

/**
 * 제어 문자인지 확인 (탭, 줄바꿈 제외)
 */
function isControlCharacter(charCode: number): boolean {
  // 0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F
  return (
    (charCode >= 0 && charCode <= 8) ||
    charCode === 11 ||
    charCode === 12 ||
    (charCode >= 14 && charCode <= 31) ||
    charCode === 127
  );
}

/**
 * 제어 문자 제거 (탭, 줄바꿈은 유지)
 */
function removeControlCharacters(input: string): string {
  let result = '';

  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i);

    if (!isControlCharacter(charCode)) {
      result += input[i];
    }
  }

  return result;
}

/**
 * 사용자 입력에서 위험 패턴을 감지
 */
function detectInjectionPatterns(input: string): string[] {
  const flags: string[] = [];

  for (const { pattern, description } of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      flags.push(description);
    }
  }

  return flags;
}

/**
 * 입력 문자열을 살균 (sanitize)
 * - 위험 구분자 이스케이프
 * - 연속 공백 정규화
 * - 제어 문자 제거
 */
function sanitizeInput(input: string): string {
  let sanitized = input;

  // 1. 제어 문자 제거 (탭, 줄바꿈은 유지)
  sanitized = removeControlCharacters(sanitized);

  // 2. 위험 구분자 이스케이프 (마크다운/프롬프트 구분자)
  sanitized = sanitized.replace(/---+/g, '－－－'); // em dash로 대체
  sanitized = sanitized.replace(/###/g, '＃＃＃'); // 전각 문자로 대체
  sanitized = sanitized.replace(/```/g, '｀｀｀'); // 전각 백틱으로 대체

  // 2-1. <USER_ANSWER> 경계 탈출 방지
  sanitized = sanitized.replace(/<\s*\/?\s*user_answer\s*>/gi, (m) =>
    m.replace(/</g, '＜').replace(/>/g, '＞'),
  );

  // 3. 연속 공백 정규화 (단, 줄바꿈은 유지)
  sanitized = sanitized.replace(/[ \t]+/g, ' ');

  // 4. 앞뒤 공백 제거
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * 프롬프트 인젝션 방어를 위한 통합 살균 함수
 *
 * @param input 사용자 입력
 * @returns 살균 결과 (살균된 문자열, 플래그 여부, 감지된 패턴)
 */
function sanitizeForPrompt(input: string): SanitizeResult {
  const flags = detectInjectionPatterns(input);
  const sanitized = sanitizeInput(input);

  return {
    sanitized,
    flagged: flags.length > 0,
    flags,
  };
}

/**
 * 여러 제출물을 일괄 살균
 */
function sanitizeSubmissions<T extends { answer: string }>(
  submissions: T[],
): { sanitized: T[]; flaggedPlayers: { playerId: string; flags: string[] }[] } {
  const flaggedPlayers: { playerId: string; flags: string[] }[] = [];

  const sanitized = submissions.map((sub) => {
    const result = sanitizeForPrompt(sub.answer);

    if (result.flagged && 'playerId' in sub) {
      flaggedPlayers.push({
        playerId: sub.playerId as string,
        flags: result.flags,
      });
    }

    return {
      ...sub,
      answer: result.sanitized,
    };
  });

  return { sanitized, flaggedPlayers };
}

export {
  SanitizeResult,
  detectInjectionPatterns,
  sanitizeInput,
  sanitizeForPrompt,
  sanitizeSubmissions,
};
