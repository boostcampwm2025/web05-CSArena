import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProblemBankService } from './problem-bank.service';
import { GetProblemBankQueryDto } from './dto/get-problem-bank-query.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('problem-bank')
export class ProblemBankController {
  constructor(private readonly problemBankService: ProblemBankService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getProblemBank(@Query() query: GetProblemBankQueryDto, @Req() req: RequestWithUser) {
    const userId = Number(req.user.id);

    return this.problemBankService.getProblemBank(userId, query);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard)
  getStatistics(@Req() req: RequestWithUser) {
    const userId = Number(req.user.id);

    return this.problemBankService.getStatistics(userId);
  }

  @Patch(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  updateBookmark(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookmarkDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = Number(req.user.id);

    return this.problemBankService.updateBookmark(userId, id, dto);
  }
}
