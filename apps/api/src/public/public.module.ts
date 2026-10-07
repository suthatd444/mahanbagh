import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { UsersModule } from '../users/users.module';
import { EncryptionModule } from '../common/encryption/encryption.module';
import { RegistrationService } from '../common/registration/registration.service';

@Module({
  imports: [UsersModule, EncryptionModule],
  controllers: [PublicController],
  providers: [PublicService, RegistrationService],
})
export class PublicModule {}
