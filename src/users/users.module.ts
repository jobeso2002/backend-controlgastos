import { Module } from '@nestjs/common';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller'; // ← agregar

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],             // ← agregar
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}