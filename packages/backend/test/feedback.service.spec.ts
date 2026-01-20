import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackService } from '../src/feedback/feedback.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CreateFeedbackDto, FeedbackCategory } from '../src/feedback/dto/create-feedback.dto';

describe('FeedbackService', () => {
    let service: FeedbackService;
    let mockLogger: any;

    // 가짜 로거 정의 (info 함수만 감시하면 됨)
    const mockLoggerInstance = {
        info: jest.fn(), // 호출 여부를 기록하는 스파이 함수
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeedbackService,
                {
                    provide: WINSTON_MODULE_PROVIDER,
                    useValue: mockLoggerInstance,
                },
            ],
        }).compile();

        service = module.get<FeedbackService>(FeedbackService);
        mockLogger = module.get(WINSTON_MODULE_PROVIDER);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('로그인한 유저의 피드백이 정상적으로 로깅되어야 한다', () => {
            // Given
            const userId = 'user-uuid-1234';
            const dto: CreateFeedbackDto = {
                category: FeedbackCategory.BUG,
                content: '버그가 있어요',
            };

            // When
            const result = service.create(userId, dto);

            // Then 1. 리턴값 확인
            expect(result).toEqual({
                success: true,
                message: '소중한 의견 감사합니다.',
            });

            // Then 2. 로거가 호출되었는지 확인
            expect(mockLogger.info).toHaveBeenCalledTimes(1);

            // Then 3. 로거에 전달된 파라미터가 맞는지 확인
            expect(mockLogger.info).toHaveBeenCalledWith(
                'User Feedback Received', // 첫 번째 인자 (메시지)
                expect.objectContaining({ // 두 번째 인자 (데이터 객체)
                    userId: 'user-uuid-1234',
                    category: FeedbackCategory.BUG,
                    content: '버그가 있어요',
                    timestamp: expect.any(String), // 시간은 매번 바뀌므로 문자열인지면 확인
                }),
            );
        });

        it('다른 유저의 피드백도 정상적으로 로깅되어야 한다', () => {
            // Given
            const userId = 'user-uuid-5678';
            const dto: CreateFeedbackDto = {
                category: FeedbackCategory.OTHER,
                content: '새 기능을 추가해주세요',
            };

            // When
            service.create(userId, dto);

            // Then
            expect(mockLogger.info).toHaveBeenCalledWith(
                'User Feedback Received',
                expect.objectContaining({
                    userId: 'user-uuid-5678',
                    category: FeedbackCategory.OTHER,
                }),
            );
        });
    });
});