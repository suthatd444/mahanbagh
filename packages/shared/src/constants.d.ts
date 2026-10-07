export declare const PERMISSIONS: {
    readonly USER_MANAGE: 'user.manage';
    readonly ROLE_MANAGE: 'role.manage';
    readonly EMPLOYEE_MANAGE: 'employee.manage';
    readonly MASTER_BROKER_MANAGE: 'master_broker.manage';
    readonly BROKER_CREATE: 'broker.create';
    readonly BROKER_VIEW_ALL: 'broker.view_all';
    readonly BROKER_UPDATE_ALL: 'broker.update_all';
    readonly BROKER_VIEW_ASSIGNED: 'broker.view_assigned';
    readonly BROKER_UPDATE_ASSIGNED: 'broker.update_assigned';
    readonly PROFILE_UPDATE_OWN: 'profile.update_own';
    readonly SECURITY_LOGS_VIEW: 'security_logs.view';
    readonly SETTINGS_MANAGE: 'settings.manage';
};
export declare const ROLES: {
    readonly ADMIN: 'ADMIN';
    readonly EMPLOYEE: 'EMPLOYEE';
    readonly MASTER_BROKER: 'MASTER_BROKER';
    readonly BROKER: 'BROKER';
};
export declare const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export declare const LOCKOUT_DURATION_MINUTES = 15;
export declare const REFERRAL_TOKEN_EXPIRY_DAYS = 7;
export declare const PASSWORD_RESET_EXPIRY_MINUTES = 60;
