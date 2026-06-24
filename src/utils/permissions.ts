import { User, UserRole, AppPermission } from '../types';

export const ALL_PERMISSIONS: AppPermission[] = [
  'Dashboard',
  'New Phone Stock',
  'Diamond Phone Stock',
  'Sales',
  'Customer Management',
  'EMI Management',
  'Payments',
  'Inventory',
  'Reservations',
  'Daily Report',
  'New Phone Report',
  'Diamond Phone Report',
  'Combined Report',
  'Diamond Secret Report',
  'User Management',
  'Settings',
  'AI Assistant'
];

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, AppPermission[]> = {
  Admin: [...ALL_PERMISSIONS],
  Manager: [
    'Dashboard', 'New Phone Stock', 'Diamond Phone Stock', 'Sales',
    'Customer Management', 'EMI Management', 'Payments', 'Inventory',
    'Reservations', 'Daily Report', 'New Phone Report', 'Diamond Phone Report',
    'Combined Report'
  ],
  SalesOfficer: [
    'Dashboard', 'New Phone Stock', 'Diamond Phone Stock', 'Sales',
    'Customer Management', 'EMI Management', 'Payments'
  ],
  InventoryManager: [
    'Dashboard', 'New Phone Stock', 'Diamond Phone Stock', 'Inventory'
  ],
  Accountant: [
    'Dashboard', 'Payments', 'Daily Report', 'Combined Report'
  ],
  Viewer: [
    'Dashboard'
  ]
};

export function hasPermission(user: User | null | undefined, permission: AppPermission): boolean {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  
  if (user.custom_permissions && user.custom_permissions.length > 0) {
    return user.custom_permissions.includes(permission);
  }
  
  return ROLE_DEFAULT_PERMISSIONS[user.role]?.includes(permission) || false;
}
