const COM_EMAIL = /^[^\s@]+@[^\s@]+\.com$/i;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function isBlank(value?: string | null) {
  return !String(value || "").trim();
}

export function validateOptionalComEmail(value: string | undefined | null, label: string) {
  const email = String(value || "").trim();
  if (!email) return null;
  if (!COM_EMAIL.test(email)) {
    return `${label} must include @ and end with .com.`;
  }
  return null;
}

export function validateOptionalEmailList(value: string | undefined | null, label: string) {
  const parts = String(value || "")
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
  for (const email of parts) {
    const error = validateOptionalComEmail(email, label);
    if (error) return error;
  }
  return null;
}

export function validateOptionalPhone(value: string | undefined | null, label: string) {
  if (isBlank(value)) return null;
  if (!/^\d{10}$/.test(digitsOnly(String(value)))) {
    return `${label} must be exactly 10 digits.`;
  }
  return null;
}

export function validateOptionalDigitLength(
  value: string | undefined | null,
  label: string,
  min: number,
  max = min,
) {
  if (isBlank(value)) return null;
  const raw = String(value).trim();
  if (/[^0-9\s-]/.test(raw)) {
    return `${label} must contain only numbers.`;
  }
  const count = digitsOnly(raw).length;
  if (count < min || count > max) {
    return min === max
      ? `${label} must be exactly ${min} digits.`
      : `${label} must be ${min} to ${max} digits.`;
  }
  return null;
}

type PracticeProfileLike = {
  phone?: string;
  emails?: string;
  faxes?: string;
  zipCode?: string;
  groupTaxId?: string;
  locations?: Array<{
    zipCode?: string;
    phone?: string;
    fax?: string;
    email?: string;
  }>;
  contactPersons?: Array<{
    mode?: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }>;
  contactNumbers?: Array<{
    mode?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }>;
};

export function validatePracticeProfileFields(profile: PracticeProfileLike) {
  const checks = [
    validateOptionalPhone(profile.phone, "Practice phone"),
    validateOptionalEmailList(profile.emails, "Practice email"),
    validateOptionalDigitLength(profile.zipCode, "ZIP code", 5, 9),
    validateOptionalDigitLength(profile.groupTaxId, "Group tax ID", 9),
  ];

  for (const location of profile.locations || []) {
    checks.push(
      validateOptionalDigitLength(location.zipCode, "Location ZIP code", 5, 9),
      validateOptionalPhone(location.phone, "Location phone"),
      validateOptionalPhone(location.fax, "Location fax"),
      validateOptionalComEmail(location.email, "Location email"),
    );
  }

  for (const contact of profile.contactPersons || []) {
    if (contact.mode === "create" && (contact.firstName || contact.lastName)) {
      if (!contact.firstName?.trim() || !contact.lastName?.trim()) {
        return "Contact person needs both a first and last name.";
      }
    }
    checks.push(
      validateOptionalComEmail(contact.email, "Contact person email"),
      validateOptionalPhone(contact.phone, "Contact person phone"),
    );
  }

  for (const contact of profile.contactNumbers || []) {
    if (contact.phone?.trim()) {
      checks.push(validateOptionalPhone(contact.phone, "Contact number"));
    } else if (contact.mode === "create" && (contact.firstName || contact.lastName)) {
      return "Each new contact number needs a 10-digit phone.";
    }
    if (contact.mode === "create" && (contact.firstName || contact.lastName)) {
      if (!contact.firstName?.trim() || !contact.lastName?.trim()) {
        return "Contact number person needs both a first and last name.";
      }
    }
  }

  const faxes = String(profile.faxes || "")
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
  for (const fax of faxes) {
    checks.push(validateOptionalPhone(fax, "Fax"));
  }

  return checks.find((error) => error) || null;
}

type PersonCredentialLike = {
  individualNpi?: string;
  ein?: string;
};

export function validatePersonCredentialFields(fields: PersonCredentialLike) {
  return (
    validateOptionalDigitLength(fields.individualNpi, "Individual NPI", 10) ||
    validateOptionalDigitLength(fields.ein, "EIN", 9)
  );
}
