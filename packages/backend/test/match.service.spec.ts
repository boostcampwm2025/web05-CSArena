import { MatchService } from '../src/match/match.service';
import { MatchSessionManager } from '../src/match/match-session-manager';
import { QuizService } from '../src/quiz/quiz.service';
import { Test, TestingModule } from '@nestjs/testing';
import {
    MultipleChoiceQuestion,
    ShortAnswerQuestion,
    Question,
} from '../src/quiz/quiz.types';
import { RoundData } from '../src/match/interfaces/match.interfaces';
import { SCORE_MAP, SPEED_BONUS } from '../src/quiz/quiz.constants';

const mockUuid = 'user-uuid-123';
const mockRoomId = 'room-123';
const mockP1 = 'player-1';
const mockP2 = 'player-2';

describe('MatchService', () => {
    let service: MatchService;
    let sessionManager: MatchSessionManager;
    let aiService: QuizService;

    // Mock Objects
    const mockSessionManager = {
        createGameSession: jest.fn(),
        startNextRound: jest.fn(),
        setQuestion: jest.fn(),
        getRoundData: jest.fn(),
        submitAnswer: jest.fn(),
        isAllSubmitted: jest.fn(),
        getGradingInput: jest.fn(),
        addScore: jest.fn(),
        getGameSession: jest.fn(),
        getScores: jest.fn(),
        setRoundResult: jest.fn(),
    };

    const mockAiService = {
        generateQuestion: jest.fn(),
        gradeSubjectiveQuestion: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchService,
                { provide: MatchSessionManager, useValue: mockSessionManager },
                { provide: QuizService, useValue: mockAiService },
            ],
        }).compile();

        service = module.get<MatchService>(MatchService);
        sessionManager = module.get<MatchSessionManager>(MatchSessionManager);
        aiService = module.get<QuizService>(QuizService);

        // Reset mocks
        jest.clearAllMocks();
    });

    describe('대기열 관리 (Queue Management)', () => {
        it('유저를 대기열에 추가하고 매칭 상대가 없으면 null을 반환해야 한다', () => {
            const match = service.addToQueue('user1', {} as any);
            expect(match).toBeNull();
            expect(service.getQueueSize()).toBe(1);
        });

        it('두 유저를 매칭시키고 매치 정보를 반환해야 한다', () => {
            service.addToQueue('user1', {} as any);
            const match = service.addToQueue('user2', {} as any);

            expect(match).toBeDefined();
            expect(match.player1).toBe('user1');
            expect(match.player2).toBe('user2');
            expect(service.getQueueSize()).toBe(0);
        });

        it('대기열에서 유저를 제거해야 한다', () => {
            service.addToQueue('user1', {} as any);
            service.removeFromQueue('user1');
            expect(service.getQueueSize()).toBe(0);
        });
    });

    describe('라운드 시작 (startRound)', () => {
        it('라운드를 시작하고, 문제를 생성한 뒤 해당 라운드의 문제를 설정해야 한다', async () => {
            // Mock Data
            const mockQuestions: Question[] = [
                { type: 'multiple_choice', question: 'Q1' } as any,
                { type: 'multiple_choice', question: 'Q2' } as any,
            ];
            const mockRoundData: RoundData = { roundNumber: 1 } as any;

            // Mock Implementation
            mockSessionManager.startNextRound.mockReturnValue(mockRoundData);
            mockAiService.generateQuestion.mockResolvedValue(mockQuestions);
            mockSessionManager.getRoundData.mockReturnValue(mockRoundData);

            // Execute
            const result = await service.startRound(mockRoomId);

            // Verify
            expect(sessionManager.startNextRound).toHaveBeenCalledWith(mockRoomId);
            expect(aiService.generateQuestion).toHaveBeenCalled();
            // roundNumber가 1이면 index 0번 문제 할당
            expect(sessionManager.setQuestion).toHaveBeenCalledWith(
                mockRoomId,
                mockQuestions[0],
            );
            expect(result).toEqual(mockRoundData);
        });
    });

    describe('정답 제출 및 채점 (submitAnswer & Grading)', () => {
        const mockQuestion: MultipleChoiceQuestion = {
            type: 'multiple_choice',
            difficulty: 'medium',
            question: 'Test Q',
            options: { A: 'A', B: 'B', C: 'C', D: 'D' },
            answer: 'A',
        };

        const mockSession = {
            roomId: mockRoomId,
            player1Id: mockP1,
            player2Id: mockP2,
            currentRound: 1,
            totalRounds: 5,
        };

        it('모든 플레이어가 제출하지 않았다면 대기 상태를 반환해야 한다', async () => {
            mockSessionManager.isAllSubmitted.mockReturnValue(false);

            const result = await service.submitAnswer(mockRoomId, mockP1, 'A');

            expect(sessionManager.submitAnswer).toHaveBeenCalledWith(
                mockRoomId,
                mockP1,
                'A',
            );
            expect(result).toEqual({ status: 'waiting_for_others' });
        });

        it('모두 제출 완료 시 객관식 문제를 채점해야 한다', async () => {
            // Setup
            mockSessionManager.isAllSubmitted.mockReturnValue(true);
            mockSessionManager.getGradingInput.mockReturnValue({
                question: mockQuestion,
                submissions: [
                    { playerId: mockP1, answer: 'A', submittedAt: 1000 }, // 정답
                    { playerId: mockP2, answer: 'B', submittedAt: 2000 }, // 오답
                ],
            });
            mockSessionManager.getGameSession.mockReturnValue(mockSession);

            // Execute
            const result: any = await service.submitAnswer(mockRoomId, mockP1, 'A');

            // Verify
            // 1. 객관식은 로컬 채점이므로 AI 호출 안함
            expect(aiService.gradeSubjectiveQuestion).not.toHaveBeenCalled();

            // 2. 점수 부여 확인 (P1은 정답이므로 medium 점수 + 스피드 보너스)
            expect(sessionManager.addScore).toHaveBeenCalledWith(
                mockRoomId,
                mockP1,
                SCORE_MAP['medium'] + SPEED_BONUS,
            );
            // P2는 오답이므로 호출 안됨 (또는 0점 로직에 따라 다름, 현재 코드는 if(isCorrect)일때만 호출)
            expect(sessionManager.addScore).toHaveBeenCalledTimes(1);

            // 3. 결과 구조 확인
            expect(result.grades).toHaveLength(2);
            expect(result.grades[0].isCorrect).toBe(true);
            expect(result.grades[1].isCorrect).toBe(false);
            expect(sessionManager.setRoundResult).toHaveBeenCalled();
        });

        it('주관식 문제일 경우 AI를 통해 채점을 진행해야 한다', async () => {
            const shortQuestion: ShortAnswerQuestion = {
                type: 'short_answer',
                difficulty: 'hard',
                question: 'Who are you?',
                answer: 'Gemini',
                keywords: ['Gemini'],
            };

            // Setup
            mockSessionManager.isAllSubmitted.mockReturnValue(true);
            mockSessionManager.getGradingInput.mockReturnValue({
                question: shortQuestion,
                submissions: [{ playerId: mockP1, answer: 'Gemini', submittedAt: 1000 }],
            });
            mockSessionManager.getGameSession.mockReturnValue(mockSession);

            // AI Mock Return
            mockAiService.gradeSubjectiveQuestion.mockResolvedValue([
                {
                    playerId: mockP1,
                    isCorrect: true,
                    feedback: 'Good',
                    answer: 'Gemini',
                    score: 0,
                },
            ]);

            // Execute
            await service.submitAnswer(mockRoomId, mockP1, 'Gemini');

            // Verify
            expect(aiService.gradeSubjectiveQuestion).toHaveBeenCalled();
            expect(sessionManager.addScore).toHaveBeenCalledWith(
                mockRoomId,
                mockP1,
                SCORE_MAP['hard'] + SPEED_BONUS,
            );
        });

        it('더 빨리 제출한 플레이어에게 스피드 보너스를 부여해야 한다', async () => {
            // Setup: 두 플레이어 모두 정답이지만 P1이 먼저 제출
            mockSessionManager.isAllSubmitted.mockReturnValue(true);
            mockSessionManager.getGradingInput.mockReturnValue({
                question: mockQuestion,
                submissions: [
                    { playerId: mockP1, answer: 'A', submittedAt: 1000 }, // 먼저 제출
                    { playerId: mockP2, answer: 'A', submittedAt: 2000 }, // 나중에 제출
                ],
            });
            mockSessionManager.getGameSession.mockReturnValue(mockSession);

            // Execute
            const result: any = await service.submitAnswer(mockRoomId, mockP1, 'A');

            // Verify: P1은 정답 + 스피드 보너스, P2는 정답만
            expect(sessionManager.addScore).toHaveBeenCalledWith(
                mockRoomId,
                mockP1,
                SCORE_MAP['medium'] + SPEED_BONUS,
            );
            expect(sessionManager.addScore).toHaveBeenCalledWith(
                mockRoomId,
                mockP2,
                SCORE_MAP['medium'],
            );
            expect(result.grades[0].score).toBe(SCORE_MAP['medium'] + SPEED_BONUS);
            expect(result.grades[1].score).toBe(SCORE_MAP['medium']);
        });

        it('오답자는 더 빨리 제출해도 보너스를 받지 못한다', async () => {
            // Setup: P1이 먼저 제출했지만 오답
            mockSessionManager.isAllSubmitted.mockReturnValue(true);
            mockSessionManager.getGradingInput.mockReturnValue({
                question: mockQuestion,
                submissions: [
                    { playerId: mockP1, answer: 'B', submittedAt: 1000 }, // 먼저 제출했지만 오답
                    { playerId: mockP2, answer: 'A', submittedAt: 2000 }, // 나중에 제출했지만 정답
                ],
            });
            mockSessionManager.getGameSession.mockReturnValue(mockSession);

            // Execute
            const result: any = await service.submitAnswer(mockRoomId, mockP1, 'B');

            // Verify: P2만 스피드 보너스 받음 (정답자 중 가장 빨리 제출)
            expect(sessionManager.addScore).toHaveBeenCalledTimes(1);
            expect(sessionManager.addScore).toHaveBeenCalledWith(
                mockRoomId,
                mockP2,
                SCORE_MAP['medium'] + SPEED_BONUS,
            );
            expect(result.grades[0].score).toBe(0);
            expect(result.grades[1].score).toBe(SCORE_MAP['medium'] + SPEED_BONUS);
        });
    });

    describe('최종 결과 계산 (Final Result Calculation)', () => {
        // 마지막 라운드 상황 설정
        const lastRoundSession = {
            player1Id: mockP1,
            player2Id: mockP2,
            currentRound: 5,
            totalRounds: 5,
        };

        const mockQuestion: MultipleChoiceQuestion = {
            type: 'multiple_choice',
            difficulty: 'easy',
            question: 'Q',
            options: {} as any,
            answer: 'A',
        };

        beforeEach(() => {
            mockSessionManager.isAllSubmitted.mockReturnValue(true);
            mockSessionManager.getGradingInput.mockReturnValue({
                question: mockQuestion,
                submissions: [
                    { playerId: mockP1, answer: 'A', submittedAt: 1000 },
                    { playerId: mockP2, answer: 'A', submittedAt: 2000 },
                ],
            });
        });

        it('점수가 더 높은 플레이어 1을 승자로 처리해야 한다', async () => {
            mockSessionManager.getGameSession.mockReturnValue(lastRoundSession);
            // P1: 50점, P2: 30점
            mockSessionManager.getScores.mockReturnValue({
                player1Score: 50,
                player2Score: 30,
            });

            const result: any = await service.submitAnswer(mockRoomId, mockP1, 'A');

            expect(result.finalResult).toBeDefined();
            expect(result.finalResult.winnerId).toBe(mockP1);
            expect(result.finalResult.isDraw).toBe(false);
            expect(result.finalResult.scores[mockP1]).toBe(50);
        });

        it('점수가 같을 경우 무승부로 처리해야 한다', async () => {
            mockSessionManager.getGameSession.mockReturnValue(lastRoundSession);
            // 동점
            mockSessionManager.getScores.mockReturnValue({
                player1Score: 40,
                player2Score: 40,
            });

            const result: any = await service.submitAnswer(mockRoomId, mockP1, 'A');

            expect(result.finalResult).toBeDefined();
            expect(result.finalResult.winnerId).toBeNull();
            expect(result.finalResult.isDraw).toBe(true);
        });

        it('마지막 라운드가 아니라면 최종 결과를 계산하지 않아야 한다', async () => {
            // 4라운드 상황
            mockSessionManager.getGameSession.mockReturnValue({
                ...lastRoundSession,
                currentRound: 4,
            });

            const result: any = await service.submitAnswer(mockRoomId, mockP1, 'A');

            expect(result.finalResult).toBeUndefined();
        });
    });
});
