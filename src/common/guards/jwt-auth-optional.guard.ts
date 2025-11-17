import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthOptionalGuard extends AuthGuard('jwt') {
  // Override para permitir acceso sin token
  handleRequest(err, user) {
    // Si hay error o no hay usuario, retornar null en lugar de lanzar error
    if (err || !user) {
      return null;
    }
    return user;
  }
}