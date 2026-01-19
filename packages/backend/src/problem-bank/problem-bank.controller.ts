import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProblemBankService } from './problem-bank.service';
import { GetProblemBankQueryDto } from './dto/get-problem-bank-query.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@Controller('problem-bank')
export class ProblemBankController {
  constructor(
    private readonly problemBankService: ProblemBankService,
    private readonly configService: ConfigService,
  ) {}

  private getUserId(req: RequestWithUser): number | null {
    const userId = Number(req.user?.id);

    if (!userId || isNaN(userId)) {
      // 개발 환경에서는 테스트용 User ID 1 사용
      const nodeEnv = this.configService.get<string>('NODE_ENV', 'production');

      if (nodeEnv === 'development') {
        return 1;
      }

      return null;
    }

    return userId;
  }

  @Get()
  getProblemBank(@Query() query: GetProblemBankQueryDto, @Req() req: RequestWithUser) {
    const userId = this.getUserId(req);

    if (!userId) {
      return {
        items: [],
        statistics: {
          totalSolved: 0,
          correctCount: 0,
          incorrectCount: 0,
          partialCount: 0,
          correctRate: 0,
        },
        totalPages: 0,
        currentPage: 1,
      };
    }

    return this.problemBankService.getProblemBank(userId, query);
  }

  @Get('statistics')
  getStatistics(@Req() req: RequestWithUser) {
    const userId = this.getUserId(req);

    if (!userId) {
      return {
        totalSolved: 0,
        correctCount: 0,
        incorrectCount: 0,
        partialCount: 0,
        correctRate: 0,
      };
    }

    return this.problemBankService.getStatistics(userId);
  }

  @Patch(':id/bookmark')
  updateBookmark(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookmarkDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = this.getUserId(req);

    if (!userId) {
      // 인증 실패 처리
      return;
    }

    return this.problemBankService.updateBookmark(userId, id, dto);
  }
}
