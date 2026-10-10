export const PERMISSIONS = {
  USER_MANAGE: 'user.manage',
  ROLE_MANAGE: 'role.manage',
  EMPLOYEE_MANAGE: 'employee.manage',
  BROKER_MANAGE: 'broker.manage',
  BROKER_CREATE: 'broker.create',
  BROKER_VIEW_ALL: 'broker.view_all',
  BROKER_UPDATE_ALL: 'broker.update_all',
  BROKER_VIEW_ASSIGNED: 'broker.view_assigned',
  BROKER_UPDATE_ASSIGNED: 'broker.update_assigned',
  PROFILE_UPDATE_OWN: 'profile.update_own',
  SECURITY_LOGS_VIEW: 'security_logs.view',
  SETTINGS_MANAGE: 'settings.manage',
  PROJECT_MANAGE: 'project.manage',
  ENQUIRY_MANAGE: 'enquiry.manage',
  ENQUIRY_CREATE: 'enquiry.create',
  ENQUIRY_VIEW_OWN: 'enquiry.view_own',
  ENQUIRY_UPDATE_OWN: 'enquiry.update_own',
} as const;

export const ROLES = {
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYEE',
  BROKER: 'BROKER',
} as const;

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;
export const REFERRAL_TOKEN_EXPIRY_DAYS = 7;
export const PASSWORD_RESET_EXPIRY_MINUTES = 60;
