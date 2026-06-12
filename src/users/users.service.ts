import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { google_id: googleId } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findOrCreateFromGoogle(profile: {
    googleId: string;
    email: string;
    full_name: string;
    avatar_url: string;
  }): Promise<User> {
    let user = await this.findByGoogleId(profile.googleId);
    if (!user) user = await this.findByEmail(profile.email);

    if (user) {
      user.full_name = profile.full_name;
      user.avatar_url = profile.avatar_url;
      user.google_id = profile.googleId;
      return this.userRepo.save(user);
    }

    const newUser = this.userRepo.create({
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      google_id: profile.googleId,
      provider: 'google',
    });
    return this.userRepo.save(newUser);
  }

  async saveHashedRefreshToken(userId: string, token: string): Promise<void> {
    const hashed = await bcrypt.hash(token, 10);
    await this.userRepo.update(userId, { hashed_refresh_token: hashed });
  }

  async removeRefreshToken(userId: string): Promise<void> {
    await this.userRepo.update(userId, { hashed_refresh_token: null });
  }

  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.hashed_refresh_token')
      .where('user.id = :id', { id: userId })
      .getOne();
    if (!user?.hashed_refresh_token) return false;
    return bcrypt.compare(token, user.hashed_refresh_token);
  }
}