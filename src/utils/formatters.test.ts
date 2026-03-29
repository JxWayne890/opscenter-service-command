import { expect, test, describe } from 'vitest';
import { formatPhoneNumber, parsePhoneNumber } from './formatters';

describe('formatPhoneNumber', () => {
  test('returns empty for empty input', () => {
    expect(formatPhoneNumber('')).toBe('');
  });

  test('returns digits for less than 4 digits', () => {
    expect(formatPhoneNumber('123')).toBe('123');
  });

  test('formats 4-6 digits with area code parentheses', () => {
    expect(formatPhoneNumber('1234')).toBe('(123) 4');
    expect(formatPhoneNumber('123456')).toBe('(123) 456');
  });

  test('formats 7+ digits as full phone number', () => {
    expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
  });

  test('strips non-digit characters first', () => {
    expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
    expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
  });

  test('truncates to 10 digits', () => {
    expect(formatPhoneNumber('12345678901234')).toBe('(123) 456-7890');
  });
});

describe('parsePhoneNumber', () => {
  test('strips all non-digit characters', () => {
    expect(parsePhoneNumber('(123) 456-7890')).toBe('1234567890');
  });

  test('returns digits unchanged', () => {
    expect(parsePhoneNumber('1234567890')).toBe('1234567890');
  });

  test('handles empty string', () => {
    expect(parsePhoneNumber('')).toBe('');
  });
});
