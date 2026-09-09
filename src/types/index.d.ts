import { UserResponseDto as User } from 'src/modules/user/dto/user.dto';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
