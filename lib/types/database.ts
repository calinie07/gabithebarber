export type UserRole = "customer" | "admin";

export type AppointmentStatus = "confirmed" | "cancelled";

export type NotificationType =
  | "booking_created"
  | "booking_cancelled"
  | "customer_registered";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  active: boolean;
  created_at: string;
}

export interface WorkingHours {
  id: string;
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

export interface BlockedTime {
  id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  customer_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithRelations extends Appointment {
  service: Pick<Service, "id" | "name" | "duration_minutes" | "price">;
  customer?: Pick<Profile, "id" | "full_name" | "phone">;
}

export interface ShopSettings {
  id: number;
  name: string;
  phone: string;
  address: string;
  maps_query: string | null;
  email: string | null;
  updated_at: string;
}

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_booking_id: string | null;
  related_customer_id: string | null;
  read: boolean;
  created_at: string;
}

export interface TimeInterval {
  start: Date;
  end: Date;
}

export interface AvailableSlot {
  start: Date;
  end: Date;
  startIso: string;
  label: string;
}
