import { Module } from '@nestjs/common';
import { TeamProfilesService } from '../common/profiles/team-profiles.service';
import { BrokersController } from './brokers.controller';
import { BrokersService } from './brokers.service';
import { UsersModule } from '../users/users.module';
import { EncryptionModule } from '../common/encryption/encryption.module';

@Module({
  imports: [UsersModule, EncryptionModule],
  controllers: [BrokersController],
  providers: [BrokersService, TeamProfilesService],
})
export class BrokersModule {}
