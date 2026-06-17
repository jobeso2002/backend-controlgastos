import {
  Controller, Get, Post, Req, Res,
  UseGuards, UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService, // ← inyectar
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    await this.authService.loginUser(user, res);
    return res.redirect(`${this.configService.get('FRONTEND_URL')}/dashboard`);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    await this.authService.logoutUser(user.id, res);
    return res.status(200).json({ message: 'Sesión cerrada' });
  }

  // ← refresh completamente reescrito
  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) throw new UnauthorizedException('No refresh token');

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET') + '_refresh',
      });
    } catch {
      this.authService.clearTokenCookies(res);
      throw new UnauthorizedException('Sesión expirada, inicia sesión nuevamente');
    }

    const isValid = await this.usersService.validateRefreshToken(
      payload.sub,
      refreshToken,
    );
    if (!isValid) {
      this.authService.clearTokenCookies(res);
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const newAccessToken = this.authService.generateAccessToken(user);
    const isProd = this.configService.get('NODE_ENV') === 'production';
    res.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return res.status(200).json({ message: 'Token renovado' });
  }

  @Get('session')
  @UseGuards(AuthGuard('jwt'))
  checkSession(@Req() req: Request) {
    const user = req.user as any;
    return { authenticated: true, user };
  }
}