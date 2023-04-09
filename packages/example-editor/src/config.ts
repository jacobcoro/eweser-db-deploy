export const dummyUserName = 'dummy';
export const dummyUserPass = 'dumdum';

// export const TEST_ROOM_ID = import.meta.env.VITE_TEST_ROOM_ID ?? '';
export const MATRIX_SERVER =
  import.meta.env.VITE_MATRIX_SERVER ?? 'https://matrix.org';

export const userIdWithServer = `@${dummyUserName}:${MATRIX_SERVER}`;

export const DEV_USERNAME = import.meta.env.VITE_DEV_USERNAME ?? dummyUserName;
export const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD ?? dummyUserPass;