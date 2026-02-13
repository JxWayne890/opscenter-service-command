export const formatPhoneNumber = (value: string) => {
    if (!value) return value;

    // Remove all non-digits
    const phoneNumber = value.replace(/[^\d]/g, '');

    // Length of raw digits
    const phoneNumberLength = phoneNumber.length;

    if (phoneNumberLength < 4) return phoneNumber;

    if (phoneNumberLength < 7) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }

    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
};

export const parsePhoneNumber = (value: string) => {
    return value.replace(/[^\d]/g, '');
};
