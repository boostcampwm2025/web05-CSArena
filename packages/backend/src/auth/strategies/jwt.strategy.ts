import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: number;
  visibleId: string;
  nickname: string;
  oauthProvider: 'github';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  visibleId: string;
  nickname: string;
  oauthProvider: 'github';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: payload.sub.toString(),
      visibleId: payload.visibleId,
      nickname: payload.nickname,
      oauthProvider: payload.oauthProvider,
    };
  }
}
