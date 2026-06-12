import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { Response } from 'express';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  generateAccessToken(user: User): string {
    return this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: this.configService.get<string>('JWT_SECRET'), expiresIn: '15m' },
    );
  }

  generateRefreshToken(user: User): string {
    return this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { secret: this.configService.get<string>('JWT_SECRET') + '_refresh', expiresIn: '7d' },
    );
  }

  setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProd = this.configService.get('NODE_ENV') === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true, secure: isProd, sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth/refresh',
    });
  }

  clearTokenCookies(res: Response): void {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
  }

  async loginUser(user: User, res: Response): Promise<{ user: Partial<User> }> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    await this.usersService.saveHashedRefreshToken(user.id, refreshToken);
    this.setTokenCookies(res, accessToken, refreshToken);
    return { user: { id: user.id, email: user.email, full_name: user.full_name, avatar_url: user.avatar_url } };
  }

  async logoutUser(userId: string, res: Response): Promise<void> {
    await this.usersService.removeRefreshToken(userId);
    this.clearTokenCookies(res);
  }
}