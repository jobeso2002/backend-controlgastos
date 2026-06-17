import { Controller } from '@nestjs/common';
import { UsersService } from './users.service';

// Controller vacío por ahora — los endpoints de usuario
// se manejan desde AuthController (/auth/session, /auth/logout)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}