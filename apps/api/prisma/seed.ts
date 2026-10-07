import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { PERMISSIONS } from "@mohan-bagh/shared";

const prisma = new PrismaClient();

const rolePermissions = {
  ADMIN: Object.values(PERMISSIONS),
  EMPLOYEE: [PERMISSIONS.MASTER_BROKER_MANAGE, PERMISSIONS.BROKER_CREATE],
  MASTER_BROKER: [
    PERMISSIONS.BROKER_CREATE,
    PERMISSIONS.BROKER_VIEW_ASSIGNED,
    PERMISSIONS.BROKER_UPDATE_ASSIGNED,
  ],
  BROKER: [PERMISSIONS.PROFILE_UPDATE_OWN],
} as const;

async function main() {
  const now = new Date();
  for (const code of Object.values(PERMISSIONS)) {
    await prisma.permissions.upsert({
      where: { code },
      update: { name: code, updated_at: now },
      create: { code, name: code, created_at: now, updated_at: now },
    });
  }

  for (const roleCode of Object.keys(rolePermissions)) {
    await prisma.roles.upsert({
      where: { code: roleCode },
      update: { name: roleCode, updated_at: now },
      create: {
        code: roleCode,
        name: roleCode,
        created_at: now,
        updated_at: now,
      },
    });
  }

  for (const [roleCode, permissionCodes] of Object.entries(rolePermissions)) {
    const role = await prisma.roles.findUniqueOrThrow({
      where: { code: roleCode },
    });
    const permissions = await prisma.permissions.findMany({
      where: { code: { in: [...permissionCodes] } },
      select: { id: true },
    });
    await prisma.role_permissions.createMany({
      data: permissions.map((permission) => ({
        role_id: role.id,
        permission_id: permission.id,
      })),
      skipDuplicates: true,
    });
  }

  const adminRole = await prisma.roles.findUniqueOrThrow({
    where: { code: "ADMIN" },
  });
  const admin = await prisma.users.findFirst({
    where: { email: "admin@mohanbagh.com" },
  });
  if (!admin) {
    await prisma.users.create({
      data: {
        uuid: randomUUID(),
        user_code: "ADMIN-000001",
        role_id: adminRole.id,
        name: "Admin",
        email: "admin@mohanbagh.com",
        mobile: "9999999999",
        status: "ACTIVE",
        is_verified: true,
        created_at: now,
        updated_at: now,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
