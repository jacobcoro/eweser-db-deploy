const Y_SWEET_CONNECTION_STRING = process.env.Y_SWEET_CONNECTION_STRING;
if (!Y_SWEET_CONNECTION_STRING) {
  throw new Error('Y_SWEET_CONNECTION_STRING not set');
}

export { Y_SWEET_CONNECTION_STRING };
