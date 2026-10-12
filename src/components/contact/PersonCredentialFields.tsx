const credentialFields: {
  key: string;
  label: string;
  type?: string;
}[] = [
  { key: "individualNpi", label: "Individual NPI" },
  { key: "individualPtan", label: "Individual PTAN" },
  { key: "individualRailroadMedicarePtan", label: "Individual PTAN (RR Medicare)" },
  { key: "caqhId", label: "CAQH ID" },
  { key: "caqhLoginId", label: "CAQH Login ID" },
  { key: "caqhPassword", label: "CAQH Password", type: "password" },
  { key: "groupPecosAccess", label: "Group PECOS Access" },
  { key: "individualMedicaidNumber", label: "Individual Medicaid Number" },
  { key: "stateLicense", label: "State License" },
  { key: "dea", label: "DEA" },
  { key: "ein", label: "EIN" },
  { key: "specialty", label: "Specialty" },
  { key: "secondarySpecialty", label: "Secondary Specialty" },
];

const specialtyOptions = [
  { label: "Family Medicine", value: "FAMILY_MEDICINE" },
  { label: "Internal Medicine", value: "INTERNAL_MEDICINE" },
  { label: "Primary Care", value: "PRIMARY_CARE" },
  { label: "Pediatrics", value: "PEDIATRICS" },
  { label: "Cardiology", value: "CARDIOLOGY" },
  { label: "Gastroenterology", value: "GASTROENTEROLOGY" },
  { label: "Endocrinology", value: "ENDOCRINOLOGY" },
  { label: "Pulmonology", value: "PULMONOLOGY" },
  { label: "Nephrology", value: "NEPHROLOGY" },
  { label: "Neurology", value: "NEUROLOGY" },
  {
    label: "Psychiatry / Behavioral Health",
    value: "PSYCHIATRY_BEHAVIORAL_HEALTH",
  },
  { label: "Other", value: "OTHER" },
];

const specialtyFieldKeys = new Set(["specialty", "secondarySpecialty"]);

export const personCredentialKeys = credentialFields.map((field) => field.key);

export default function PersonCredentialFields({
  values,
  onChange,
}: {
  values: object;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-3 border-t border-[#f0ece6] pt-4">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
        Credentials
      </p>
      {credentialFields.map((field) => {
        const value = String(
          (values as Record<string, string | undefined>)[field.key] || "",
        );

        if (specialtyFieldKeys.has(field.key)) {
          const hasKnownValue = specialtyOptions.some(
            (option) => option.value === value,
          );

          return (
            <div key={field.key}>
              <label className="mb-1 block text-[12px] font-medium text-slate-600">
                {field.label}
              </label>
              <select
                value={value}
                onChange={(event) => onChange(field.key, event.target.value)}
                className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              >
                <option value="">Select {field.label.toLowerCase()}</option>
                {specialtyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {value && !hasKnownValue ? (
                  <option value={value}>{value}</option>
                ) : null}
              </select>
            </div>
          );
        }

        return (
          <div key={field.key}>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              {field.label}
            </label>
            <input
              type={field.type || "text"}
              value={value}
              onChange={(event) => onChange(field.key, event.target.value)}
              autoComplete="off"
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>
        );
      })}
    </div>
  );
}
