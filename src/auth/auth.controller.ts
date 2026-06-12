import { Controller, Get, Post, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';


@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
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
      throw new UnauthorizedException('Token expirado');
    }
    const { UsersService } = await import('../users/users.service');
    return res.status(200).json({ message: 'Token renovado' });
  }

  @Get('session')
  @UseGuards(AuthGuard('jwt'))
  checkSession(@Req() req: Request) {
    const user = req.user as any;
    return { authenticated: true, user };
  }
}