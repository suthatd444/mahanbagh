import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { UsersModule } from '../users/users.module';
import { EncryptionModule } from '../common/encryption/encryption.module';
import { RegistrationService } from '../common/registration/registration.service';
import { TeamProfilesService } from '../common/profiles/team-profiles.service';

@Module({
  imports: [UsersModule, EncryptionModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, RegistrationService, TeamProfilesService],
})
export class EmployeesModule {}
