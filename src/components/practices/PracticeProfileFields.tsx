import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { getPersonsView } from "../../services/operations/persons";
import type { PracticeBody } from "./types";

export type PracticeLocationForm = {
  locationName: string;
  isPrimary: boolean;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  fax: string;
  email: string;
};

export type PracticeContactForm = {
  mode: "select" | "create";
  personId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  label: string;
};

export type PracticeProfileForm = {
  referredBy: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  faxes: string;
  phone: string;
  emails: string;
  groupTaxId: string;
  groupMedicarePtan: string;
  railroadMedicarePtan: string;
  dmePtan: string;
  groupMedicaidPtan: string;
  sparkGroup: string;
  locations: PracticeLocationForm[];
  contactPersons: PracticeContactForm[];
  contactNumbers: PracticeContactForm[];
};

type PersonOption = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function listText(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
  }
  return text(value);
}

function splitList(value: string) {
  return value
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function emptyLocation(): PracticeLocationForm {
  return {
    locationName: "",
    isPrimary: false,
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    phone: "",
    fax: "",
    email: "",
  };
}

export function emptyContact(mode: "select" | "create" = "select"): PracticeContactForm {
  return {
    mode,
    personId: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    label: "",
  };
}

export const emptyPracticeProfileForm: PracticeProfileForm = {
  referredBy: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  faxes: "",
  phone: "",
  emails: "",
  groupTaxId: "",
  groupMedicarePtan: "",
  railroadMedicarePtan: "",
  dmePtan: "",
  groupMedicaidPtan: "",
  sparkGroup: "",
  locations: [],
  contactPersons: [],
  contactNumbers: [],
};

export function practiceProfileFromRecord(
  record?: Record<string, unknown> | null,
): PracticeProfileForm {
  const locations = Array.isArray(record?.locations) ? record.locations : [];
  const contactPersons = Array.isArray(record?.contactPersons)
    ? record.contactPersons
    : [];
  const contactNumbers = Array.isArray(record?.contactNumbers)
    ? record.contactNumbers
    : [];

  return {
    referredBy: text(record?.referredBy),
    addressLine1: text(record?.addressLine1),
    addressLine2: text(record?.addressLine2),
    city: text(record?.city),
    state: text(record?.state),
    zipCode: text(record?.zipCode),
    country: text(record?.country),
    faxes: listText(record?.faxes),
    phone: text(record?.phone),
    emails: listText(record?.emails),
    groupTaxId: text(record?.groupTaxId),
    groupMedicarePtan: text(record?.groupMedicarePtan),
    railroadMedicarePtan: text(record?.railroadMedicarePtan),
    dmePtan: text(record?.dmePtan),
    groupMedicaidPtan: text(record?.groupMedicaidPtan),
    sparkGroup: text(record?.sparkGroup),
    locations: locations.map((entry, index) => {
      const location = entry as Record<string, unknown>;
      const firstPrimaryIndex = locations.findIndex(
        (item) => Boolean((item as Record<string, unknown>).isPrimary),
      );
      return {
        locationName: text(location.locationName),
        isPrimary: firstPrimaryIndex === index,
        addressLine1: text(location.addressLine1),
        addressLine2: text(location.addressLine2),
        city: text(location.city),
        state: text(location.state),
        zipCode: text(location.zipCode),
        country: text(location.country),
        phone: text(location.phone),
        fax: text(location.fax),
        email: text(location.email),
      };
    }),
    contactPersons: contactPersons.map((entry) => {
      const contact = entry as Record<string, any>;
      return {
        mode: "select" as const,
        personId: text(contact.personId || contact.person?.id),
        firstName: text(contact.person?.firstName),
        lastName: text(contact.person?.lastName),
        phone: text(contact.person?.phone),
        email: text(contact.person?.email),
        label: "",
      };
    }),
    contactNumbers: contactNumbers.map((entry) => {
      const contact = entry as Record<string, any>;
      const personId = text(contact.personId || contact.person?.id);
      return {
        mode: personId ? ("select" as const) : ("create" as const),
        personId,
        firstName: text(contact.person?.firstName),
        lastName: text(contact.person?.lastName),
        phone: text(contact.phone || contact.person?.phone),
        email: text(contact.person?.email),
        label: text(contact.label),
      };
    }),
  };
}

export function practiceProfilePayload(
  form: PracticeProfileForm,
): Partial<PracticeBody> {
  const optional = (value: string) => value.trim() || null;

  const locations = form.locations
    .filter((location) =>
      [
        location.locationName,
        location.addressLine1,
        location.city,
        location.phone,
        location.email,
      ].some((value) => value.trim()),
    )
    .map((location) => ({
      locationName: optional(location.locationName),
      isPrimary: location.isPrimary,
      addressLine1: optional(location.addressLine1),
      addressLine2: optional(location.addressLine2),
      city: optional(location.city),
      state: optional(location.state),
      zipCode: optional(location.zipCode),
      country: optional(location.country),
      phone: optional(location.phone),
      fax: optional(location.fax),
      email: optional(location.email),
    }));

  const contactPersons: Record<string, unknown>[] = [];
  for (const entry of form.contactPersons) {
    if (entry.mode === "select") {
      if (entry.personId) contactPersons.push({ personId: entry.personId });
      continue;
    }
    if (!entry.firstName.trim() || !entry.lastName.trim()) continue;
    contactPersons.push({
      firstName: entry.firstName.trim(),
      lastName: entry.lastName.trim(),
      phone: entry.phone.trim() || undefined,
      email: entry.email.trim() || undefined,
      role: "OTHER",
      influence: "MEDIUM",
    });
  }

  return {
    referredBy: optional(form.referredBy),
    addressLine1: optional(form.addressLine1),
    addressLine2: optional(form.addressLine2),
    city: optional(form.city),
    state: optional(form.state),
    zipCode: optional(form.zipCode),
    country: optional(form.country),
    faxes: splitList(form.faxes),
    phone: optional(form.phone),
    emails: splitList(form.emails),
    groupTaxId: optional(form.groupTaxId),
    groupMedicarePtan: optional(form.groupMedicarePtan),
    railroadMedicarePtan: optional(form.railroadMedicarePtan),
    dmePtan: optional(form.dmePtan),
    groupMedicaidPtan: optional(form.groupMedicaidPtan),
    sparkGroup: optional(form.sparkGroup),
    locations,
    contactPersons,
  };
}

const textFields: { key: keyof PracticeProfileForm; label: string; placeholder?: string }[] = [
  { key: "phone", label: "Phone" },
  { key: "faxes", label: "Faxes", placeholder: "Comma-separated" },
  { key: "emails", label: "Emails", placeholder: "Comma-separated" },
  { key: "addressLine1", label: "Address Line 1" },
  { key: "addressLine2", label: "Address Line 2" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zipCode", label: "ZIP Code" },
  { key: "country", label: "Country" },
  { key: "groupTaxId", label: "Group Tax ID" },
  { key: "groupMedicarePtan", label: "Group Medicare PTAN" },
  { key: "railroadMedicarePtan", label: "Railroad Medicare PTAN" },
  { key: "dmePtan", label: "DME PTAN" },
  { key: "groupMedicaidPtan", label: "Group Medicaid PTAN" },
  { key: "sparkGroup", label: "Spark Group" },
];

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-[12px] font-medium text-slate-600">
      {children}
    </label>
  );
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
    />
  );
}

export default function PracticeProfileFields({
  value,
  onChange,
}: {
  value: PracticeProfileForm;
  onChange: (next: PracticeProfileForm) => void;
}) {
  const [people, setPeople] = useState<PersonOption[]>([]);

  useEffect(() => {
    let active = true;
    getPersonsView({ page: 1, limit: 1000 })
      .then((data) => {
        if (!active) return;
        setPeople(
          data.rows.map((row) => ({
            id: row.id,
            name: String(row.values.fullName || "").trim(),
            phone: String(row.values.phone || ""),
            email: String(row.values.email || ""),
          })),
        );
      })
      .catch(() => {
        if (active) setPeople([]);
      });
    return () => {
      active = false;
    };
  }, []);

  function setText(key: keyof PracticeProfileForm, next: string) {
    onChange({ ...value, [key]: next });
  }

  function updateLocation(index: number, patch: Partial<PracticeLocationForm>) {
    const locations = value.locations.map((location, locationIndex) =>
      locationIndex === index ? { ...location, ...patch } : location,
    );
    onChange({ ...value, locations });
  }

  function updateContact(
    key: "contactPersons" | "contactNumbers",
    index: number,
    patch: Partial<PracticeContactForm>,
  ) {
    const rows = value[key].map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    );
    onChange({ ...value, [key]: rows });
  }

  function changeContactMode(
    key: "contactPersons" | "contactNumbers",
    index: number,
    mode: "select" | "create",
  ) {
    const rows = value[key].map((row, rowIndex) =>
      rowIndex === index ? emptyContact(mode) : row,
    );
    onChange({ ...value, [key]: rows });
  }

  function renderContactList(
    key: "contactPersons" | "contactNumbers",
    title: string,
  ) {
    const rows = value[key];
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <button
            type="button"
            onClick={() =>
              onChange({ ...value, [key]: [...rows, emptyContact()] })
            }
            className="flex items-center gap-1 text-[12px] text-[#4f63ea]"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        {rows.map((row, index) => (
          <div
            key={`${key}-${index}`}
            className="space-y-2 rounded-md border border-[#ece8e1] p-2"
          >
            <div className="flex items-center gap-2">
              <select
                value={row.mode}
                onChange={(event) =>
                  changeContactMode(
                    key,
                    index,
                    event.target.value as "select" | "create",
                  )
                }
                className="app-control flex-1 rounded-md px-2 py-2 text-[13px]"
              >
                <option value="select">Select person</option>
                <option value="create">Create person</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    [key]: rows.filter((_, rowIndex) => rowIndex !== index),
                  })
                }
                className="text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {row.mode === "select" ? (
              <select
                value={row.personId}
                onChange={(event) => {
                  const person = people.find((item) => item.id === event.target.value);
                  updateContact(key, index, {
                    personId: event.target.value,
                    phone: row.phone || person?.phone || "",
                    email: person?.email || row.email,
                  });
                }}
                className="app-control w-full rounded-md px-2 py-2 text-[13px]"
              >
                <option value="">-- Select a person --</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name || person.email || person.id}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <TextInput
                  value={row.firstName}
                  placeholder="First name"
                  onChange={(event) =>
                    updateContact(key, index, { firstName: event.target.value })
                  }
                />
                <TextInput
                  value={row.lastName}
                  placeholder="Last name"
                  onChange={(event) =>
                    updateContact(key, index, { lastName: event.target.value })
                  }
                />
              </div>
            )}
            <TextInput
              value={row.phone}
              placeholder="Phone"
              onChange={(event) =>
                updateContact(key, index, { phone: event.target.value })
              }
            />
            {row.mode === "create" ? (
              <TextInput
                value={row.email}
                placeholder="Email"
                onChange={(event) =>
                  updateContact(key, index, { email: event.target.value })
                }
              />
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-[#f0ece6] pt-4">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
        Practice profile
      </p>
      {textFields.map((field) => (
        <div key={field.key}>
          <FieldLabel>{field.label}</FieldLabel>
          <TextInput
            value={String(value[field.key] || "")}
            placeholder={field.placeholder}
            onChange={(event) => setText(field.key, event.target.value)}
          />
        </div>
      ))}

      {renderContactList("contactPersons", "Contact person")}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            Locations
          </p>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                locations: [
                  ...value.locations,
                  {
                    ...emptyLocation(),
                    isPrimary: value.locations.length === 0,
                  },
                ],
              })
            }
            className="flex items-center gap-1 text-[12px] text-[#4f63ea]"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        {value.locations.length > 0 ? (
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-slate-600">
              Primary location
            </span>
            <select
              value={String(
                Math.max(
                  0,
                  value.locations.findIndex((location) => location.isPrimary),
                ),
              )}
              onChange={(event) => {
                const selected = Number(event.target.value);
                onChange({
                  ...value,
                  locations: value.locations.map((item, locationIndex) => ({
                    ...item,
                    isPrimary: locationIndex === selected,
                  })),
                });
              }}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            >
              {value.locations.map((location, index) => (
                <option key={`primary-location-${index}`} value={index}>
                  {location.locationName.trim() || `Location ${index + 1}`}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {value.locations.map((location, index) => (
          <div
            key={`location-${index}`}
            className="space-y-2 rounded-md border border-[#ece8e1] p-2"
          >
            <div className="flex items-center gap-2">
              <TextInput
                value={location.locationName}
                placeholder="Location name"
                onChange={(event) =>
                  updateLocation(index, { locationName: event.target.value })
                }
              />
              <button
                type="button"
                onClick={() => {
                  const remaining = value.locations.filter(
                    (_, locationIndex) => locationIndex !== index,
                  );
                  const hasPrimary = remaining.some((item) => item.isPrimary);
                  onChange({
                    ...value,
                    locations: remaining.map((item, locationIndex) => ({
                      ...item,
                      isPrimary: hasPrimary ? item.isPrimary : locationIndex === 0,
                    })),
                  });
                }}
                className="text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <TextInput
              value={location.addressLine1}
              placeholder="Address line 1"
              onChange={(event) =>
                updateLocation(index, { addressLine1: event.target.value })
              }
            />
            <TextInput
              value={location.addressLine2}
              placeholder="Address line 2"
              onChange={(event) =>
                updateLocation(index, { addressLine2: event.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <TextInput
                value={location.city}
                placeholder="City"
                onChange={(event) =>
                  updateLocation(index, { city: event.target.value })
                }
              />
              <TextInput
                value={location.state}
                placeholder="State"
                onChange={(event) =>
                  updateLocation(index, { state: event.target.value })
                }
              />
              <TextInput
                value={location.zipCode}
                placeholder="ZIP"
                onChange={(event) =>
                  updateLocation(index, { zipCode: event.target.value })
                }
              />
              <TextInput
                value={location.country}
                placeholder="Country"
                onChange={(event) =>
                  updateLocation(index, { country: event.target.value })
                }
              />
            </div>
            <TextInput
              value={location.phone}
              placeholder="Phone"
              onChange={(event) =>
                updateLocation(index, { phone: event.target.value })
              }
            />
            <TextInput
              value={location.fax}
              placeholder="Fax"
              onChange={(event) =>
                updateLocation(index, { fax: event.target.value })
              }
            />
            <TextInput
              value={location.email}
              placeholder="Email"
              onChange={(event) =>
                updateLocation(index, { email: event.target.value })
              }
            />
          </div>
        ))}
      </div>
      <div>
        <FieldLabel>Referred By</FieldLabel>
        <TextInput
          value={value.referredBy}
          onChange={(event) => setText("referredBy", event.target.value)}
        />
      </div>
    </div>
  );
}
