export type PhoneStatus = 'Available' | 'Reserved' | 'Sold' | 'Returned' | 'Damaged';

export type UserRole = 'Admin' | 'SalesOfficer' | 'InventoryManager';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  fullName: string;
}

export type ReservationStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ReservationRequest {
  id: string;
  customerName: string;
  mobile: string;
  address: string;
  productId: string;
  imei: string;
  phoneModel: string;
  requestDate: string;
  status: ReservationStatus;
  notes?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  imei1: string;
  oldStatus: PhoneStatus | '';
  newStatus: PhoneStatus;
  changedBy: string;
  changedAt: string;
  note: string;
  customerName?: string;
}

export interface Phone {
  id: string; // Internal ID
  brand: string;
  model: string;
  imei1: string;
  imei2: string;
  ram: string;
  storage: string;
  color: string;
  purchasePrice: number;
  sellingPrice: number;
  supplier: string;
  warranty: string;
  purchaseDate: string;
  status: PhoneStatus;
  reservedForCustomerId?: string;
  reservedForCustomerName?: string;
  soldToCustomerId?: string;
  soldToCustomerName?: string;
  statusNote?: string;
}

export type RiskRating = 'Low Risk' | 'Medium Risk' | 'High Risk';

export interface Customer {
  id: string;
  fullName: string;
  fatherName: string;
  motherName: string;
  nidObject: string;
  mobile: string;
  alternateMobile: string;
  address: string;
  occupation: string;
  monthlyIncome: number;
  riskRating: RiskRating;
  // Removed photo uploads for now
}

export interface EMISale {
  id: string;
  phoneId: string;
  customerId: string;
  saleId?: string;
  receiptId?: string;
  saleDate: string;
  totalPrice: number;
  downPayment: number;
  emiMonths: number;
  interestRate: number; // e.g. percentage 0-100
  totalInterest: number;
  totalInstallmentAmount: number;
  monthlyInstallment: number;
  nextDueDate: string;
  paidInstallments: number;
  status: 'Active' | 'Completed' | 'Defaulted';
}

export interface Collection {
  id: string;
  emiSaleId: string;
  amountPaid: number;
  paymentDate: string;
  paymentType: 'Monthly Installment' | 'Partial Payment' | 'Advance Payment';
  paymentMethod?: 'Cash' | 'bKash' | 'Nagad' | 'Bank Transfer';
  lateFee: number;
  remarks?: string;
}
