import { Module } from '@nestjs/common';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { EmployeesModule } from './employees/employees.module';
import { MasterBrokersModule } from './master-brokers/master-brokers.module';
import { BrokersModule } from './brokers/brokers.module';
import { PublicModule } from './public/public.module';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ValidationFilter } from './common/filters/validation.filter';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    EncryptionModule,
    AuthModule,
    UsersModule,
    AdminModule,
    EmployeesModule,
    MasterBrokersModule,
    BrokersModule,
    PublicModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: ValidationFilter },
  ],
})
export class AppModule {}
