import { UserResponseDto as User } from 'src/user/dto/user.dto';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
