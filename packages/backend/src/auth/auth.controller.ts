import { Controller, Get, NotFoundException, Query, Req, Res, UseGuards } from '@nestjs/common';
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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('dev-login')
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
  githubLogin() {
    // Passport handles redirect to GitHub
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
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
  logout(@Res() res: Response) {
    res.clearCookie('refreshToken');

    return res.json({ message: 'Logged out successfully' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.authService.getUserProfile(user.id);

    if (!profile) {
      return { error: 'User not found' };
    }

    return profile;
  }
}
