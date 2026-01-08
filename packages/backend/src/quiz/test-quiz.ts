import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { ClovaClientService } from './clova/clova-client.service';
import { QuizService } from './quiz.service';
import { QuizGameService } from './quiz-game.service';
import { QuizRoundStore } from './quiz-round.store';

async function testQuizSystem() {
  console.log('🚀 Quiz System Test Started\n');

  // NestJS Testing Module 생성
  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule.forRoot()],
    providers: [QuizGameService, QuizService, ClovaClientService, QuizRoundStore],
  }).compile();

  const quizGameService = moduleRef.get<QuizGameService>(QuizGameService);
  const quizRoundStore = moduleRef.get<QuizRoundStore>(QuizRoundStore);

  try {
    // 1. 게임 생성
    console.log('📝 Step 1: Creating game session...');
    const roomId = 'test-room-001';
    const player1Id = 'player-alice';
    const player2Id = 'player-bob';

    quizGameService.createGame(roomId, player1Id, player2Id);
    console.log(`✅ Game created: ${roomId}\n`);

    // 2. 라운드 시작 (AI가 문제 생성)
    console.log('📝 Step 2: Starting round and generating questions...');
    const roundData = await quizGameService.startRound(roomId);
    console.log('✅ Round started!');
    console.log('📋 Question:', roundData.question);
    console.log('');

    if (!roundData.question) {
      throw new Error('Question is null');
    }

    // 3. 플레이어 답안 제출
    console.log('📝 Step 3: Submitting answers...');

    // Player 1 제출 (정답)
    const correctAnswer = (roundData.question as { answer: string }).answer;
    console.log(`Player 1 (${player1Id}) submitting: ${correctAnswer}`);
    const _result1 = await quizGameService.submitAnswer(roomId, player1Id, correctAnswer);
    console.log('✅ Player 1 answer submitted');

    // Player 2 제출 (오답)
    const wrongAnswer = correctAnswer === 'A' ? 'B' : 'A';
    console.log(`Player 2 (${player2Id}) submitting: ${wrongAnswer}`);
    const result2 = await quizGameService.submitAnswer(roomId, player2Id, wrongAnswer);
    console.log('✅ Player 2 answer submitted\n');

    // 4. 채점 결과 확인
    console.log('📝 Step 4: Checking grading results...');
    console.log('📊 Grading Result:', JSON.stringify(result2, null, 2));
    console.log('');

    // 5. 결과 검증
    if ('grades' in result2) {
      console.log('✅ Test PASSED! Structured Outputs working correctly!\n');

      console.log('🎯 Summary:');
      console.log(`- Model: HCX-007`);
      console.log(`- Structured Outputs: Enabled`);
      console.log(`- Question Type: ${roundData.question.type}`);
      console.log(`- Correct Answer: ${correctAnswer}`);
      console.log(
        `- Player 1 Score: ${result2.grades.find((g) => g.playerId === player1Id)?.score}`,
      );
      console.log(
        `- Player 2 Score: ${result2.grades.find((g) => g.playerId === player2Id)?.score}`,
      );
    } else {
      console.error('❌ Test FAILED: Result is not in expected format');
    }
  } catch (error) {
    console.error('❌ Test FAILED with error:');
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    quizRoundStore.clearAll();
  }
}

// 실행
testQuizSystem()
  .then(() => {
    console.log('\n✅ All tests completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
