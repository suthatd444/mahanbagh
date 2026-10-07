import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { EncryptionModule } from '../common/encryption/encryption.module';
import { RegistrationService } from '../common/registration/registration.service';

@Module({
  imports: [UsersModule, EncryptionModule],
  controllers: [AdminController],
  providers: [AdminService, RegistrationService],
})
export class AdminModule {}
