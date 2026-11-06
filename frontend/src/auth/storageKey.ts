/** Shared so api.ts can read the persisted token at module load (before React mounts), and AuthContext can read/write it on login/logout, without the two importing each other. */
export const AUTH_STORAGE_KEY = 'sapling_auth';
