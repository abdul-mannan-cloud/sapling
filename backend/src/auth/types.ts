export type Role = 'admin' | 'patient';

export interface AuthUser {
  userId: string;
  username: string;
  role: Role;
  /** Only set for role 'patient'. */
  patientId?: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
  patientId?: string;
}
