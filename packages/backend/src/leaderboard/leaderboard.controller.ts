import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardQueryDto, MatchType } from './dto/leaderboard-query.dto';
import {
  MultiLeaderboardResponseDto,
  SingleLeaderboardResponseDto,
} from './dto/leaderboard-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '리더보드 조회',
    description: '상위 100명의 랭킹과 내 순위를 반환합니다.',
  })
  @ApiQuery({
    name: 'type',
    enum: MatchType,
    description: '매칭 타입 (multi: 멀티플레이, single: 싱글플레이)',
  })
  @ApiResponse({
    status: 200,
    description: '리더보드 조회 성공',
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async getLeaderboard(
    @Query() query: LeaderboardQueryDto,
    @Req() req: RequestWithUser,
  ): Promise<MultiLeaderboardResponseDto | SingleLeaderboardResponseDto> {
    const userId = Number(req.user.id);

    return this.leaderboardService.getLeaderboard(query.type, userId);
  }
}
