import { Controller, Get, NotFoundException, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './strategies/jwt.strategy';
import { GithubProfile } from './strategies/github.strategy';

interface RequestWithGithubUser extends Request {
  user: GithubProfile;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('dev-login')
  @ApiOperation({
    summary: '개발용 로그인',
    description: '개발 환경에서만 사용 가능한 로그인 엔드포인트입니다.',
  })
  @ApiResponse({ status: 302, description: '프론트엔드로 리다이렉트 (access_token 포함)' })
  @ApiResponse({ status: 400, description: 'name 파라미터 누락' })
  @ApiResponse({ status: 404, description: '개발 환경이 아님' })
  async devLogin(@Query('name') name: string, @Res() res: Response) {
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    if (nodeEnv !== 'development') {
      throw new NotFoundException();
    }

    if (!name) {
      return res.status(400).json({ message: 'name query parameter is required' });
    }

    const { accessToken, refreshToken, user } = await this.authService.loginWithDevUser(name);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const userJson = encodeURIComponent(JSON.stringify(user));
    res.redirect(`${frontendUrl}/auth/callback#access_token=${accessToken}&user=${userJson}`);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({
    summary: 'GitHub OAuth 로그인',
    description: 'GitHub OAuth 페이지로 리다이렉트합니다.',
  })
  @ApiResponse({ status: 302, description: 'GitHub 로그인 페이지로 리다이렉트' })
  githubLogin() {
    // Passport handles redirect to GitHub
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({
    summary: 'GitHub OAuth 콜백',
    description: 'GitHub 인증 후 콜백 처리 및 토큰 발급',
  })
  @ApiResponse({ status: 302, description: '프론트엔드로 리다이렉트 (access_token 포함)' })
  async githubCallback(@Req() req: RequestWithGithubUser, @Res() res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.loginWithOAuth(req.user);

    const isProduction = this.configService.get('NODE_ENV') === 'production';

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

    // Redirect to frontend with access token in URL fragment
    const userJson = encodeURIComponent(JSON.stringify(user));
    res.redirect(`${frontendUrl}/auth/callback#access_token=${accessToken}&user=${userJson}`);
  }

  @Get('refresh')
  @ApiOperation({
    summary: '토큰 갱신',
    description: 'Refresh Token을 사용하여 새로운 Access Token을 발급합니다.',
  })
  @ApiCookieAuth('refreshToken')
  @ApiResponse({
    status: 200,
    description: '토큰 갱신 성공',
    schema: {
      properties: {
        accessToken: { type: 'string', description: '새로운 Access Token' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Refresh Token이 없거나 유효하지 않음' })
  async refresh(@Req() req: Request, @Res() res: Response) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token' });
    }

    try {
      const tokens = await this.authService.refreshTokens(refreshToken);

      const isProduction = this.configService.get('NODE_ENV') === 'production';

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({ accessToken: tokens.accessToken });
    } catch {
      res.clearCookie('refreshToken');

      return res.status(401).json({ message: 'Invalid refresh token' });
    }
  }

  @Get('logout')
  @ApiOperation({
    summary: '로그아웃',
    description: 'Refresh Token 쿠키를 삭제하여 로그아웃 처리합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '로그아웃 성공',
    schema: {
      properties: {
        message: { type: 'string', example: 'Logged out successfully' },
      },
    },
  })
  logout(@Res() res: Response) {
    res.clearCookie('refreshToken');

    return res.json({ message: 'Logged out successfully' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '내 프로필 조회',
    description: '현재 로그인한 사용자의 프로필 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '프로필 조회 성공',
    schema: {
      properties: {
        id: { type: 'number', description: '사용자 ID' },
        visibleId: { type: 'string', description: '외부에 노출되는 사용자 ID' },
        nickname: { type: 'string', description: '사용자 닉네임' },
        email: { type: 'string', description: '사용자 이메일' },
        userProfile: { type: 'string', description: '사용자 프로필 정보' },
        oauthProvider: { type: 'string', description: 'OAuth 제공자 (github 등)' },
        tier: { type: 'string', description: '사용자 티어' },
        expPoint: { type: 'number', description: '경험치' },
        winCount: { type: 'number', description: '승리 횟수' },
        loseCount: { type: 'number', description: '패배 횟수' },
      },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.authService.getUserProfile(user.id);

    if (!profile) {
      return { error: 'User not found' };
    }

    return profile;
  }
}
