import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { FilterUsersCrmDto } from './dtos/filter-users-crm.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from './entities/user.entity';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // -------------------------
  // GET PROFILE
  // -------------------------
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener perfil completo del usuario autenticado',
    description: 'Retorna toda la información del perfil del usuario incluyendo datos personales (nombre, email, teléfono, dirección, fecha de nacimiento, género), preferencias de mascotas (hasDogs, hasCats, hasOtherPets) y la lista completa de sus mascotas registradas con todos sus detalles (tipo, nombre, raza, edad, fecha de nacimiento, sexo).'
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario obtenido exitosamente. Incluye información personal, preferencias y mascotas.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticación inválido o expirado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado en la base de datos.',
  })
  async getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  // -------------------------
  // UPDATE PROFILE
  // -------------------------
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar perfil del usuario autenticado',
    description: 'Permite actualizar parcialmente el perfil del usuario incluyendo: fecha de nacimiento, género, barrio/zona, preferencias de mascotas (hasDogs, hasCats, hasOtherPets) y la lista completa de mascotas. Al enviar el array de mascotas, se reemplaza completamente la lista existente. Cada mascota debe incluir: id temporal (generado en frontend), tipo (dog/cat/other), nombre, y opcionalmente raza, edad, fecha de nacimiento y sexo (male/female).'
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado exitosamente. Retorna el usuario actualizado con todos sus datos y mascotas.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos. Verifique que los campos cumplan con las validaciones requeridas (formatos de fecha, enums válidos, longitudes de texto, etc.).',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticación inválido o expirado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado en la base de datos.',
  })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updatedUser = await this.usersService.updateProfile(
      user.id,
      updateProfileDto,
    );

    return {
      message: 'Perfil actualizado correctamente',
      user: updatedUser,
    };
  }

  // -------------------------
  // GET USERS FOR CRM
  // -------------------------
  @Get('crm/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Listar usuarios con filtros para CRM (Solo Admin)',
    description: 'Obtiene lista de usuarios con filtros avanzados, paginación y búsqueda. Endpoint para el panel de administración CRM.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado. Solo administradores pueden acceder.',
  })
  getUsersForCrm(@Query() filters: FilterUsersCrmDto) {
    return this.usersService.getUsersForCrm(filters);
  }


  // -------------------------
  // DELETE USER
  // -------------------------
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar usuario (Solo Admin)',
    description: 'Elimina un usuario del sistema. Solo administradores pueden realizar esta acción. Se eliminan también las mascotas asociadas al usuario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario eliminado exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado. Solo administradores pueden eliminar usuarios.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
