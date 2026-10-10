"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASSWORD_RESET_EXPIRY_MINUTES = exports.REFERRAL_TOKEN_EXPIRY_DAYS = exports.LOCKOUT_DURATION_MINUTES = exports.MAX_FAILED_LOGIN_ATTEMPTS = exports.ROLES = exports.PERMISSIONS = void 0;
exports.PERMISSIONS = {
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
};
exports.ROLES = {
    ADMIN: 'ADMIN',
    EMPLOYEE: 'EMPLOYEE',
    BROKER: 'BROKER',
};
exports.MAX_FAILED_LOGIN_ATTEMPTS = 5;
exports.LOCKOUT_DURATION_MINUTES = 15;
exports.REFERRAL_TOKEN_EXPIRY_DAYS = 7;
exports.PASSWORD_RESET_EXPIRY_MINUTES = 60;
