import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { UsersModule } from '../users/users.module';
import { EncryptionModule } from '../common/encryption/encryption.module';
import { RegistrationService } from '../common/registration/registration.service';

@Module({
  imports: [UsersModule, EncryptionModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, RegistrationService],
})
export class EmployeesModule {}
