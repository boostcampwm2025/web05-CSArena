import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MyPageResponseDto } from './dto/mypage-response.dto';
import { TierHistoryResponseDto } from './dto/tier-history-response.dto';
import { MatchHistoryResponseDto } from './dto/match-history-response.dto';
import { MatchHistoryQueryDto } from './dto/match-history-request.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyPage(@CurrentUser() user: AuthenticatedUser): Promise<MyPageResponseDto> {
    return this.userService.getMyPageData(Number(user.id));
  }

  @Get('me/tier-history')
  @UseGuards(JwtAuthGuard)
  async getTierHistory(@CurrentUser() user: AuthenticatedUser): Promise<TierHistoryResponseDto> {
    return this.userService.getTierHistory(Number(user.id));
  }

  @Get('me/match-history')
  @UseGuards(JwtAuthGuard)
  async getMatchHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MatchHistoryQueryDto,
  ): Promise<MatchHistoryResponseDto> {
    return this.userService.getMatchHistory(Number(user.id), query);
  }
}
