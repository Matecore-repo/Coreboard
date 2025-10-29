const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const isValidUUID = (value?: string | null): boolean => {
  if (!value) return false;
  return UUID_REGEX.test(value);
};
