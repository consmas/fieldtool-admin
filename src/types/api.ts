export interface JwtPayload {
  exp?: number;
  sub?: string;
  user_id?: string;
  email?: string;
  role?: string;
  name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  jwt?: string;
  access_token?: string;
  data?: {
    token?: string;
  };
  user?: {
    id: number;
    email: string;
    name?: string;
    role?: string;
  };
}

export interface Trip {
  id: number;
  reference_code?: string;
  waybill_number?: string | null;
  status?: string;
  pickup_location?: string;
  dropoff_location?: string;
  pickup_notes?: string | null;
  dropoff_notes?: string | null;
  material_description?: string | null;
  scheduled_pickup_at?: string | null;
  scheduled_dropoff_at?: string | null;
  driver?: UserSummary | null;
  driver_id?: number | null;
  dispatcher_id?: number | null;
  truck?: VehicleSummary | null;
  truck_id?: number | null;
  trailer?: VehicleSummary | null;
  trailer_id?: number | null;
  vehicle_id?: number | null;
  vehicle?: VehicleSummary | null;
  truck_reg_no?: string | null;
  trip_date?: string | null;
  driver_contact?: string | null;
  truck_type_capacity?: string | null;
  client_name?: string | null;
  destination?: string | null;
  delivery_address?: string | null;
  delivery_place_id?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  delivery_map_url?: string | null;
  delivery_location_source?:
    | "manual"
    | "google_autocomplete"
    | "shared_link"
    | "geolocation"
    | string
    | null;
  tonnage_load?: string | null;
  customer_contact_name?: string | null;
  customer_contact_phone?: string | null;
  special_instructions?: string | null;
  arrival_time_at_site?: string | null;
  pod_type?: string | null;
  waybill_returned?: boolean | null;
  notes_incidents?: string | null;
  fuel_station_used?: string | null;
  fuel_payment_mode?: string | null;
  fuel_litres_filled?: string | null;
  fuel_receipt_no?: string | null;
  fuel_allocated_litres?: string | null;
  fuel_allocation_station?: string | null;
  fuel_allocation_payment_mode?: "cash" | "card" | "credit" | string | null;
  fuel_allocation_reference?: string | null;
  fuel_allocation_note?: string | null;
  return_time?: string | null;
  vehicle_condition_post_trip?: string | null;
  post_trip_inspector_name?: string | null;
  road_expense_disbursed?: boolean | null;
  road_expense_reference?: string | null;
  road_expense_payment_status?: "pending" | "paid" | "rejected" | string | null;
  road_expense_payment_method?: "cash" | "momo" | "bank" | string | null;
  road_expense_payment_reference?: string | null;
  road_expense_note?: string | null;
  start_odometer_photo_url?: string | null;
  end_odometer_photo_url?: string | null;
  client_rep_signature_url?: string | null;
  proof_of_fuelling_url?: string | null;
  proof_of_fueling_url?: string | null;
  proofOfFuellingUrl?: string | null;
  inspector_signature_url?: string | null;
  security_signature_url?: string | null;
  driver_signature_url?: string | null;
  evidences?: EvidenceItem[];
  evidence?: EvidenceItem[];
  start_odometer_km?: number | null;
  end_odometer_km?: number | null;
  start_odometer_captured_at?: string | null;
  end_odometer_captured_at?: string | null;
  start_odometer_captured_by_id?: number | null;
  end_odometer_captured_by_id?: number | null;
  start_odometer_note?: string | null;
  end_odometer_note?: string | null;
  start_odometer_lat?: number | null;
  start_odometer_lng?: number | null;
  end_odometer_lat?: number | null;
  end_odometer_lng?: number | null;
  start_odometer_photo_attached?: boolean;
  end_odometer_photo_attached?: boolean;
  status_changed_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  latest_location?: LatestLocation | null;
  events?: TripEvent[];
}

export interface TripListResponse {
  data?: Trip[];
  trips?: Trip[];
}

export interface TripResponse {
  data?: Trip;
  trip?: Trip;
}

export interface LatestLocationResponse {
  data?: {
    lat: number;
    lng: number;
    recorded_at?: string;
  };
  location?: {
    lat: number;
    lng: number;
    recorded_at?: string;
  };
}

export interface TripEvent {
  id: number;
  event_type: string;
  message: string;
  data?: Record<string, unknown>;
  created_by_id?: number;
  created_at?: string;
}

export interface EvidenceItem {
  id?: number;
  kind?: string | null;
  note?: string | null;
  recorded_at?: string | null;
  photo_url?: string | null;
}

export interface TripStop {
  id?: number;
  sequence?: number;
  destination?: string | null;
  delivery_address?: string | null;
  tonnage_load?: string | null;
  waybill_number?: string | null;
  customer_contact_name?: string | null;
  customer_contact_phone?: string | null;
  special_instructions?: string | null;
}

export interface LatestLocation {
  id: number;
  lat: number;
  lng: number;
  speed?: number | null;
  heading?: number | null;
  recorded_at?: string | null;
}

export interface UserSummary {
  id: number;
  email: string;
  name?: string;
  role?: string;
  phone_number?: string | null;
}

export interface VehicleSummary {
  id: number;
  name: string;
  kind?: string;
  license_plate?: string | null;
  truck_type_capacity?: string | null;
}

export interface User {
  id: number;
  email: string;
  name?: string;
  role?: string;
  phone_number?: string | null;
}

export interface Vehicle {
  id: number;
  name: string;
  kind: string;
  license_plate?: string | null;
  vin?: string | null;
  notes?: string | null;
  active: boolean;
  truck_type_capacity?: string | null;
  insurance_policy_number?: string | null;
  insurance_provider?: string | null;
  insurance_issued_at?: string | null;
  insurance_expires_at?: string | null;
  insurance_coverage_amount?: number | string | null;
  insurance_notes?: string | null;
  insurance?: {
    document_url?: string | null;
  } | null;
  insurance_document_url?: string | null;
}

export interface Destination {
  id: number;
  name: string;
  average_distance_km: number;
  base_km: number;
  base_trip_cost: number;
  liters_per_km: number;
  active: boolean;
}

export interface FuelPrice {
  id: number;
  price_per_liter: number;
  effective_at: string;
}

export interface RateCalculationResponse {
  base_trip_cost: number;
  base_km: number;
  total_km: number;
  liters_per_km: number;
  fuel_cost_per_km: number;
  extra_distance_charge: number;
  extra_stop_charge: number;
  final_trip_cost: number;
}

export interface PreTripInspection {
  id: number;
  trip_id: number;
  captured_by_id?: number | null;
  odometer_value_km?: string | null;
  odometer_captured_at?: string | null;
  odometer_lat?: number | null;
  odometer_lng?: number | null;
  brakes?: boolean | null;
  tyres?: boolean | null;
  lights?: boolean | null;
  mirrors?: boolean | null;
  horn?: boolean | null;
  fuel_sufficient?: boolean | null;
  load_area_ready?: boolean | null;
  load_status?: "full" | "partial" | null;
  load_secured?: boolean | null;
  load_note?: string | null;
  accepted?: boolean | null;
  accepted_at?: string | null;
  waybill_number?: string | null;
  assistant_name?: string | null;
  assistant_phone?: string | null;
  fuel_level?: string | null;
  odometer_photo_attached?: boolean;
  load_photo_attached?: boolean;
  waybill_photo_attached?: boolean;
  odometer_photo_url?: string | null;
  load_photo_url?: string | null;
  waybill_photo_url?: string | null;
  inspector_signature_url?: string | null;
  inspection_verification_status?: "approved" | "rejected" | string | null;
  inspection_verified_by_id?: number | null;
  inspection_verified_at?: string | null;
  inspection_verification_note?: string | null;
  inspection_confirmed?: boolean | null;
  inspection_confirmed_by_id?: number | null;
  inspection_confirmed_at?: string | null;
  core_checklist?: Record<
    string,
    | boolean
    | "pass"
    | "fail"
    | "na"
    | null
    | {
        status?: "pass" | "fail" | "na" | string | null;
        note?: string | null;
      }
  > | null;
  core_checklist_template?: Array<{
    code: string;
    label: string;
    section: string;
    severity_on_fail?: "blocker" | "warning" | string | null;
  }> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ChatMessage {
  id: number | string;
  trip_id?: number | null;
  body: string;
  created_at?: string | null;
  updated_at?: string | null;
  read_at?: string | null;
  read?: boolean | null;
  sender_id?: number | null;
  user_id?: number | null;
  sender_role?: string | null;
  sender_name?: string | null;
  sender_type?: string | null;
}

export interface ChatThread {
  trip_id?: number | null;
  trip_reference?: string | null;
  trip_status?: string | null;
  unread_count?: number;
  last_message_at?: string | null;
  messages: ChatMessage[];
}

export interface ChatInboxThread {
  trip_id: number;
  trip_reference?: string | null;
  trip_status?: string | null;
  unread_count: number;
  last_message_at?: string | null;
  last_message_body?: string | null;
}
