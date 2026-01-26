import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User, UserStatistics } from '../user/entity';
import { GithubProfile } from './strategies/github.strategy';
import { AuthenticatedUser, JwtPayload } from './strategies/jwt.strategy';
import { calculateTier } from '../common/utils/tier.util';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface LoginResult extends TokenPair {
  user: {
    id: number;
    visibleId: string;
    nickname: string;
    email: string | null;
    userProfile: string | null;
    tier: string;
    expPoint: number;
    winCount: number;
    loseCount: number;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserStatistics)
    private readonly statsRepo: Repository<UserStatistics>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async loginWithOAuth(profile: GithubProfile): Promise<LoginResult> {
    let user = await this.userRepo.findOne({
      where: {
        oauthProvider: profile.oauthProvider,
        oauthId: profile.oauthId,
      },
      relations: ['statistics'],
    });

    if (!user) {
      user = await this.createUserWithStats(profile);
    }

    const tokens = this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async loginWithDevUser(name: string): Promise<LoginResult> {
    const oauthId = `dev-${name}`;

    let user = await this.userRepo.findOne({
      where: {
        oauthProvider: 'github',
        oauthId,
      },
      relations: ['statistics'],
    });

    if (!user) {
      user = await this.createUserWithStats({
        oauthId,
        oauthProvider: 'github',
        nickname: name,
        email: `${name}@dev.local`,
        userProfile: null,
      });
    }

    const tokens = this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  private async createUserWithStats(profile: GithubProfile): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        oauthId: profile.oauthId,
        oauthProvider: profile.oauthProvider,
        nickname: profile.nickname,
        email: profile.email,
        userProfile: profile.userProfile,
      });
      const savedUser = await manager.save(User, user);

      const stats = manager.create(UserStatistics, {
        userId: savedUser.id,
        winCount: 0,
        loseCount: 0,
        tierPoint: 1000,
        totalMatches: 0,
        expPoint: 0,
      });
      savedUser.statistics = await manager.save(UserStatistics, stats);

      return savedUser;
    });
  }

  generateTokens(user: User): TokenPair {
    const payload: JwtPayload = {
      sub: user.id,
      visibleId: user.id.toString(),
      nickname: user.nickname,
      oauthProvider: user.oauthProvider as 'github',
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
        relations: ['statistics'],
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  validateToken(token: string): AuthenticatedUser | null {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      return {
        id: payload.sub.toString(),
        visibleId: payload.visibleId,
        nickname: payload.nickname,
        oauthProvider: payload.oauthProvider,
      };
    } catch {
      return null;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    const id = Number.parseInt(userId, 10);

    if (Number.isNaN(id)) {
      return null;
    }

    return this.userRepo.findOne({
      where: { id },
      relations: ['statistics'],
    });
  }

  async getUserProfile(userId: string) {
    const user = await this.getUserById(userId);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      visibleId: user.id.toString(),
      nickname: user.nickname,
      email: user.email,
      userProfile: user.userProfile,
      oauthProvider: user.oauthProvider,
      tier: calculateTier(user.statistics?.tierPoint ?? 1000),
      expPoint: user.statistics?.expPoint ?? 0,
      winCount: user.statistics?.winCount ?? 0,
      loseCount: user.statistics?.loseCount ?? 0,
    };
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      visibleId: user.id.toString(),
      nickname: user.nickname,
      email: user.email,
      userProfile: user.userProfile,
      tier: calculateTier(user.statistics?.tierPoint ?? 1000),
      expPoint: user.statistics?.expPoint ?? 0,
      winCount: user.statistics?.winCount ?? 0,
      loseCount: user.statistics?.loseCount ?? 0,
    };
  }
}
