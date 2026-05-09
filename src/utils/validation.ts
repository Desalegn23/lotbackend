/**
 * Validates that a phone number contains only digits and is within the max length.
 */
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[0-9]+$/;
  return phoneRegex.test(phone) && phone.length <= 15;
};
