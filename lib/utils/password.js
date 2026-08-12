export const PASSWORD_MIN_LENGTH = 10;

export function passwordValidationMessage(password) {
  const value = String(password || '');

  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalıdır.`;
  }
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) {
    return 'Şifre en az bir büyük ve bir küçük harf içermelidir.';
  }
  if (!/\d/.test(value)) {
    return 'Şifre en az bir rakam içermelidir.';
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    return 'Şifre en az bir özel karakter içermelidir.';
  }

  return '';
}
