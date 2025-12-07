import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Pet } from './entities/pet.entity';
import { UpdateProfileDto } from './dtos/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
  ) {}

  /**
   * Obtener perfil completo del usuario
   */
  async getProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['pets'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Crear una copia sin campos sensibles
    const { password, passwordResetToken, emailVerificationToken, ...safeUser } = user;

    return safeUser;
  }

  /**
   * Actualizar perfil del usuario
   */
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['pets'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Actualizar campos básicos del perfil
    if (updateProfileDto.birthDate !== undefined) {
      user.birthDate = new Date(updateProfileDto.birthDate);
    }
    if (updateProfileDto.gender !== undefined) {
      user.gender = updateProfileDto.gender;
    }
    if (updateProfileDto.barrio !== undefined) {
      user.barrio = updateProfileDto.barrio;
    }
    if (updateProfileDto.hasDogs !== undefined) {
      user.hasDogs = updateProfileDto.hasDogs;
    }
    if (updateProfileDto.hasCats !== undefined) {
      user.hasCats = updateProfileDto.hasCats;
    }
    if (updateProfileDto.hasOtherPets !== undefined) {
      user.hasOtherPets = updateProfileDto.hasOtherPets;
    }

    // Guardar cambios en el usuario
    await this.userRepository.save(user);

    // Manejar mascotas: eliminar las existentes y crear las nuevas
    if (updateProfileDto.pets !== undefined) {
      // Eliminar mascotas existentes
      if (user.pets && user.pets.length > 0) {
        await this.petRepository.remove(user.pets);
      }

      // Crear nuevas mascotas
      if (updateProfileDto.pets.length > 0) {
        const newPets = updateProfileDto.pets.map((petDto) => {
          const pet = new Pet();
          pet.userId = userId;
          pet.type = petDto.type;
          pet.name = petDto.name;
          if (petDto.breed) {
            pet.breed = petDto.breed;
          }
          if (petDto.age) {
            pet.age = petDto.age;
          }
          return pet;
        });

        await this.petRepository.save(newPets);
      }
    }

    // Obtener usuario actualizado con mascotas
    const updatedUser = await this.getProfile(userId);

    return updatedUser;
  }
}
