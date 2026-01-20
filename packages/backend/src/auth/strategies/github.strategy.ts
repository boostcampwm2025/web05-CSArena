import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

export interface GithubProfile {
  oauthId: string;
  oauthProvider: 'github';
  nickname: string;
  email: string | null;
  userProfile: string | null;
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): GithubProfile {
    const { id, username, emails, photos } = profile;

    return {
      oauthId: id,
      oauthProvider: 'github',
      nickname: username || `user-${id}`,
      email: emails?.[0]?.value || null,
      userProfile: photos?.[0]?.value || null,
    };
  }
}
