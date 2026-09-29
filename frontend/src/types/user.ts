// src/types/auth.ts

export type User = {
  id: string; // uuid
  full_name: string; // varchar(120)
  email: string; // varchar(254)
  is_active: boolean; // boolean
  created_at: string; // timestamptz(3) ISO string
  updated_at: string; // timestamptz(3) ISO string
};

// What the frontend sends during registration
export type SignupPayload = {
  full_name: string;
  email: string;
  password: string;
};

// What the frontend sends during login
export type LoginPayload = {
  email: string;
  password: string;
};

// Standard response from your backend authentication endpoint
export type AuthResponse = {
  token: string;
  user: User;
};