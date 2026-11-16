/**
 * Test credentials and environment constants for AMS QA Automation
 */

export const TEST_USERS = {
  superAdmin: {
    email: 'superadmin@gmail.com',
    password: 'password123',
    role: 'Super Admin',
    name: 'Super Administrator',
  },
  admin: {
    email: 'admin@gmail.com',
    password: 'password123',
    role: 'Admin',
    name: 'Administrator',
  },
  approver: {
    email: 'approver@gmail.com',
    password: 'password123',
    role: 'Approver',
    name: 'Test Approver',
  },
};

export const APP_ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
  approvals: '/approvals',
  dokumen: '/dokumen',
  userManagement: '/super-admin/user-management',
};

