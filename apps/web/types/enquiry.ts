import type { EnquiryStatus } from "./project";

export type EnquiryRole = "EMPLOYEE" | "BROKER";

export interface EnquiryMemberRef {
  id: string;
  name: string;
  userCode: string | null;
  role: string;
}

export interface EnquiryAssignee {
  id: string;
  name: string;
  userCode: string | null;
  mobile: string;
  role: EnquiryRole;
}

export interface Enquiry {
  id: string;
  customerName: string;
  phone: string;
  email?: string | null;
  remarks?: string | null;
  status: EnquiryStatus;
  assignedTo: EnquiryMemberRef | null;
  createdBy: EnquiryMemberRef | null;
  mobileVerifiedAt: string | null;
  hiddenAt: string | null;
  createdAt: string;
  updatedAt: string;
}