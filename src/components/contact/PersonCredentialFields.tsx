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
      {credentialFields.map((field) => (
        <div key={field.key}>
          <label className="mb-1 block text-[12px] font-medium text-slate-600">
            {field.label}
          </label>
          <input
            type={field.type || "text"}
            value={String(
              (values as Record<string, string | undefined>)[field.key] || "",
            )}
            onChange={(event) => onChange(field.key, event.target.value)}
            autoComplete="off"
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
          />
        </div>
      ))}
    </div>
  );
}
