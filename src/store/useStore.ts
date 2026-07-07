import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Phone, Customer, EMISale, Collection, StockMovement, PhoneStatus, User, ReservationRequest, ReservationStatus } from '../types';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import bcrypt from 'bcryptjs';

export interface AuditLog {
  id: string;
  userName: string;
  role: string;
  action: string;
  timestamp: string;
}

interface AppState {
  phones: Phone[];
  customers: Customer[];
  emiSales: EMISale[];
  collections: Collection[];
  stockMovements: StockMovement[];
  users: User[];
  currentUser: User | null;
  reservations: ReservationRequest[];
  auditLogs: AuditLog[];

  addUser: (user: User) => Promise<void>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  // App Sync State
  isLoading: boolean;
  initFromSheets: () => Promise<void>;

  // Auth
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;

  // Audit
  addAuditLog: (action: string) => void;

  // Reservations
  addReservation: (reservation: ReservationRequest) => Promise<void>;
  updateReservationStatus: (id: string, newStatus: ReservationStatus) => Promise<void>;

  // Async Actions linked to Google Sheets Backend
  addPhone: (phone: Phone) => Promise<void>;
  updatePhone: (id: string, updates: Partial<Phone>) => Promise<void>;
  deletePhone: (id: string) => Promise<void>;
  changePhoneStatus: (productId: string, newStatus: PhoneStatus, note?: string, customerId?: string, customerName?: string) => Promise<void>;

  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  addEmiSale: (sale: EMISale) => Promise<void>;
  addCollection: (collection: Collection) => Promise<void>;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      phones: [],
      customers: [],
      emiSales: [],
      collections: [],
      stockMovements: [],
      users: [
        { id: '4', username: 'superadmin', password: '1030', role: 'SuperAdmin', fullName: 'Super Admin' },
      ],
      currentUser: null,
      reservations: [],
      auditLogs: [],
      isLoading: false,

      addAuditLog: (action: string) => {
        const user = get().currentUser;
        if (!user) return;
        set(state => ({
          auditLogs: [...(state.auditLogs || []), {
            id: crypto.randomUUID(),
            userName: user.fullName || user.username,
            role: user.role,
            timestamp: new Date().toISOString(),
            action
          }]
        }));
      },

      addUser: async (user) => {
        set((state) => ({ users: [...state.users, user] }));
        try {
          await GoogleSheetsService.create('Users', {
            ...user,
            custom_permissions: user.custom_permissions ? JSON.stringify(user.custom_permissions) : '[]'
          });
        } catch (error: any) {
          set((state) => ({ users: state.users.filter(u => u.id !== user.id) }));
          alert("Error adding user: " + error.message);
          throw error;
        }
      },
      updateUser: async (id, updates) => {
        const previousUsers = get().users;
        set((state) => ({
          users: state.users.map(u => u.id === id ? { ...u, ...updates } : u)
        }));
        try {
          const payload = { ...updates };
          if (updates.custom_permissions) {
            payload.custom_permissions = JSON.stringify(updates.custom_permissions) as any;
          }
          await GoogleSheetsService.update('Users', id, payload);
        } catch (error: any) {
          set({ users: previousUsers });
          alert("Error updating user: " + error.message);
          throw error;
        }
      },
      deleteUser: async (id) => {
        const previousUsers = get().users;
        set((state) => ({
          users: state.users.filter(u => u.id !== id)
        }));
        try {
          await GoogleSheetsService.delete('Users', id);
        } catch (error: any) {
          set({ users: previousUsers });
          alert("Error deleting user: " + error.message);
          throw error;
        }
      },

      // Initializer to load remote configurations if GAS is connected
      initFromSheets: async () => {
        set({ isLoading: true });
        try {
          const [phonesRes, customersRes, emiSalesRes, collectionsRes, smRes, resvRes, usersRes] = await Promise.all([
            GoogleSheetsService.getAll('Products'),
            GoogleSheetsService.getAll('Customers'),
            GoogleSheetsService.getAll('EMISales'),
            GoogleSheetsService.getAll('EMICollections'),
            GoogleSheetsService.getAll('StockMovement'),
            GoogleSheetsService.getAll('ReservationRequests'),
            GoogleSheetsService.getAll('Users')
          ]);

          if (phonesRes && phonesRes.length > 0) {
            const mappedPhones = (phonesRes as Phone[]).map(p => ({
              ...p,
              stockType: p.stockType || 'NEW'
            }));
            set({ phones: mappedPhones });
          }
          if (customersRes && customersRes.length > 0) set({ customers: customersRes as Customer[] });
          if (emiSalesRes && emiSalesRes.length > 0) set({ emiSales: emiSalesRes as EMISale[] });
          if (collectionsRes && collectionsRes.length > 0) set({ collections: collectionsRes as Collection[] });
          if (smRes && smRes.length > 0) set({ stockMovements: smRes as StockMovement[] });
          if (resvRes && resvRes.length > 0) set({ reservations: resvRes as ReservationRequest[] });
          if (usersRes && usersRes.length > 0) {
            const parsedUsers = (usersRes as any[]).map((u) => ({
              ...u,
              is_active:
                u.is_active === undefined
                  ? true
                  : u.is_active === "true" || u.is_active === true,
              custom_permissions: u.custom_permissions
                ? typeof u.custom_permissions === "string"
                  ? JSON.parse(u.custom_permissions)
                  : u.custom_permissions
                : [],
            }));

            // Local SuperAdmin (cannot be removed)
            const localSuperAdmins = get().users.filter(
              (u) => u.role === "SuperAdmin"
            );

            // Remove duplicate usernames from Google Sheet
            const sheetUsers = parsedUsers.filter(
              (sheetUser) =>
                !localSuperAdmins.some(
                  (localUser) =>
                    localUser.username.toLowerCase() ===
                    String(sheetUser.username).toLowerCase()
                )
            );

            // Merge Local SuperAdmin + Google Sheet Users
            set({
              users: [...localSuperAdmins, ...sheetUsers] as User[],
            });
          }
        } catch (err) {
          console.error("Failed to sync from Google Sheets.", err);
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (username, password) => {
        const user = get().users.find(u => u.username === username);
        if (!user || user.is_active === false) {
          console.log("User not found or inactive.");
          return false;
        }

        let isMatch = false;

        if (password) {
          const storedHash = String(user.password_hash || '');

          if (
            storedHash.startsWith('$2a$') ||
            storedHash.startsWith('$2b$') ||
            storedHash.startsWith('$2y$')
          ) {
            isMatch = await bcrypt.compare(
              password,
              storedHash
            );
          } else {
            // Legacy/plain-text support
            isMatch =
              String(user.password || '') === String(password) ||
              storedHash === String(password);
          }
        }

        if (isMatch) {
          console.log("Login successful for:", username);
          const updatedUser = { ...user, last_login: new Date().toISOString() };
          try {
            await get().updateUser(user.id, { last_login: updatedUser.last_login });
          } catch (e) {
            console.error("Failed to update last_login", e);
          }
          set({ currentUser: updatedUser });
          return true;
        }
        console.log("Password mismatch for:", username);
        return false;
      },

      logout: () => {
        set({ currentUser: null });
      },

      addReservation: async (reservation) => {
        set((state) => ({ reservations: [reservation, ...state.reservations] }));
        try {
          await GoogleSheetsService.create('ReservationRequests', reservation);
        } catch (error: any) {
          set((state) => ({ reservations: state.reservations.filter(r => r.id !== reservation.id) }));
          alert("Error adding reservation: " + error.message);
        }
      },

      updateReservationStatus: async (id, newStatus) => {
        const previous = get().reservations;
        const reservation = previous.find(r => r.id === id);

        if (!reservation) return;

        set((state) => ({
          reservations: state.reservations.map(r => r.id === id ? { ...r, status: newStatus } : r)
        }));

        try {
          await GoogleSheetsService.update('ReservationRequests', id, { status: newStatus });
          if (newStatus === 'Approved') {
            await get().changePhoneStatus(reservation.productId, 'Reserved', 'Reservation Approved', undefined, reservation.customerName);
          }
        } catch (error: any) {
          set({ reservations: previous });
          alert("Error updating reservation: " + error.message);
        }
      },

      addPhone: async (phone) => {
        set((state) => ({ phones: [phone, ...state.phones] })); // Optimistic UI Update
        try {
          await GoogleSheetsService.create('Products', phone); // Push direct API execution
        } catch (error: any) {
          set((state) => ({ phones: state.phones.filter(p => p.id !== phone.id) })); // Rollback
          alert("Error adding phone: " + error.message);
        }
      },

      updatePhone: async (id, updates) => {
        const previousPhones = get().phones;
        set((state) => ({ phones: state.phones.map(p => p.id === id ? { ...p, ...updates } : p) }));
        try {
          await GoogleSheetsService.update('Products', id, updates);
        } catch (error: any) {
          set({ phones: previousPhones });
          alert("Error updating phone: " + error.message);
        }
      },

      deletePhone: async (id) => {
        const previousPhones = get().phones;
        set((state) => ({ phones: state.phones.filter(p => p.id !== id) }));
        try {
          await GoogleSheetsService.delete('Products', id);
        } catch (error: any) {
          set({ phones: previousPhones });
          alert("Error deleting phone: " + error.message);
        }
      },

      changePhoneStatus: async (productId, newStatus, note = '', customerId?: string, customerName?: string) => {
        const phone = get().phones.find(p => p.id === productId);
        if (!phone || phone.status === newStatus) return;

        const oldStatus = phone.status;
        const previousPhones = get().phones;
        const previousMovements = get().stockMovements;
        const previousSales = get().emiSales;

        const movement: StockMovement = {
          id: crypto.randomUUID(),
          productId: phone.id,
          imei1: phone.imei1,
          oldStatus,
          newStatus,
          changedBy: 'Admin', // Static for now, could be passed in
          changedAt: new Date().toISOString(),
          note,
          customerName
        };

        let updates: Partial<Phone> = { status: newStatus, statusNote: note };

        if (newStatus === 'Reserved') {
          updates.reservedForCustomerId = customerId;
          updates.reservedForCustomerName = customerName;
        } else if (newStatus === 'Sold') {
          updates.soldToCustomerId = customerId;
          updates.soldToCustomerName = customerName;
        } else if (newStatus === 'Available' || newStatus === 'Damaged' || newStatus === 'Returned') {
          // Clear reservations / sole info if reverting to these
          updates.reservedForCustomerId = '';
          updates.reservedForCustomerName = '';
        }

        set((state) => {
          let updatedSales = state.emiSales;
          // Return Logic
          if (newStatus === 'Returned') {
            updatedSales = state.emiSales.filter(s => !(s.phoneId === phone.id && s.status === 'Active'));
          }

          return {
            phones: state.phones.map(p => p.id === productId ? { ...p, ...updates } : p),
            stockMovements: [movement, ...state.stockMovements],
            emiSales: updatedSales
          };
        });

        try {
          const updateRes = await GoogleSheetsService.update('Products', productId, updates);
          await GoogleSheetsService.create('StockMovement', {
            ...movement,
            id: updateRes.id || '' // use created or something, let GAS handle id
          });
          // Backend shouldn't strictly need us to manually delete EMI, but ideally we mark it refunded or so
        } catch (error: any) {
          set({ phones: previousPhones, stockMovements: previousMovements, emiSales: previousSales });
          alert("Error changing status: " + error.message);
        }
      },

      addCustomer: async (customer) => {
        set((state) => ({ customers: [customer, ...state.customers] }));
        try {
          await GoogleSheetsService.create('Customers', customer);
        } catch (error: any) {
          set((state) => ({ customers: state.customers.filter(c => c.id !== customer.id) }));
          alert("Error adding customer: " + error.message);
        }
      },

      updateCustomer: async (id, updates) => {
        const previous = get().customers;
        set((state) => ({ customers: state.customers.map(c => c.id === id ? { ...c, ...updates } : c) }));
        try {
          await GoogleSheetsService.update('Customers', id, updates);
        } catch (error: any) {
          set({ customers: previous });
          alert("Error updating customer: " + error.message);
        }
      },

      deleteCustomer: async (id) => {
        const previous = get().customers;
        set((state) => ({ customers: state.customers.filter(c => c.id !== id) }));
        try {
          await GoogleSheetsService.delete('Customers', id);
        } catch (error: any) {
          set({ customers: previous });
          alert("Error deleting customer: " + error.message);
        }
      },

      addEmiSale: async (sale) => {
        const previousSales = get().emiSales;
        const previousPhones = get().phones;

        set((state) => ({
          emiSales: [sale, ...state.emiSales],
          phones: state.phones.map(p => p.id === sale.phoneId ? { ...p, status: 'Sold' } : p)
        }));

        try {
          await GoogleSheetsService.create('EMISales', sale);
          await GoogleSheetsService.update('Products', sale.phoneId, { status: 'Sold' });
        } catch (error: any) {
          set({ emiSales: previousSales, phones: previousPhones });
          alert("Error creating sale: " + error.message);
        }
      },

      addCollection: async (collection) => {
        const previousSales = get().emiSales;
        const previousCollections = get().collections;

        set((state) => {
          const sale = state.emiSales.find(s => s.id === collection.emiSaleId);
          if (!sale) return state;

          let newStatus = sale.status;
          let newPaid = sale.paidInstallments;
          if (collection.paymentType === 'Monthly Installment') {
            newPaid += 1;
            if (newPaid >= sale.emiMonths) newStatus = 'Completed';
          }

          return {
            collections: [collection, ...state.collections],
            emiSales: state.emiSales.map(s => s.id === collection.emiSaleId ? {
              ...s,
              paidInstallments: newPaid,
              status: newStatus
            } : s)
          };
        });

        try {
          await GoogleSheetsService.create('EMICollections', collection);
          // Also push the parent EMI status update remotely
          const updatedSale = get().emiSales.find(s => s.id === collection.emiSaleId);
          if (updatedSale) {
            await GoogleSheetsService.update('EMISales', updatedSale.id, {
              paidInstallments: updatedSale.paidInstallments,
              status: updatedSale.status
            });
          }
        } catch (error: any) {
          set({ collections: previousCollections, emiSales: previousSales });
          alert("Error adding collection: " + error.message);
        }
      }
    }),
    {
      name: 'angaria-erp-storage',
      partialize: (state) => Object.fromEntries(
        Object.entries(state).filter(([key]) => !['users', 'isLoading'].includes(key))
      ),
    }
  )
);
