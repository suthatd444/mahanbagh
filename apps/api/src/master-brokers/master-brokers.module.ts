import { Module } from '@nestjs/common';
import { TeamProfilesService } from '../common/profiles/team-profiles.service';
import { MasterBrokersController } from './master-brokers.controller';
import { MasterBrokersService } from './master-brokers.service';
import { UsersModule } from '../users/users.module';
import { EncryptionModule } from '../common/encryption/encryption.module';

@Module({
  imports: [UsersModule, EncryptionModule],
  controllers: [MasterBrokersController],
  providers: [MasterBrokersService, TeamProfilesService],
})
export class MasterBrokersModule {}
