const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

// "+971 50-123 4567" / "00971501234567" / Arabic digits  ->  "+971501234567"
export const normalizePhone = (value) => {
  let s = String(value)
    .trim()
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  return s;
};

// E.164
export const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
