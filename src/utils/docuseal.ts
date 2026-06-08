import type { DocusealTemplate } from "../services/operations/agreements";

export type DocusealField = DocusealTemplate["fields"][number];

export function isEditableDocusealField(field: DocusealField) {
  return field.type !== "signature";
}

export function getDocusealFieldKey(field: DocusealField) {
  return field.uuid || field.name;
}

export function getDocusealFieldLabel(field: DocusealField, index = 0) {
  return field.name?.trim() || `Field ${index + 1}`;
}

export function getDocusealFieldInputType(field?: DocusealField) {
  switch (field?.type) {
    case "date":
      return "date";
    case "number":
      return "number";
    case "email":
      return "email";
    case "tel":
      return "tel";
    default:
      return "text";
  }
}

export function getDocusealFieldValue(
  fieldValues: Record<string, string>,
  field: DocusealField,
) {
  return fieldValues[field.uuid] ?? fieldValues[field.name] ?? "";
}

export function buildTemplateFieldValues(template?: DocusealTemplate) {
  const values: Record<string, string> = {};
  if (!template) return values;

  for (const field of template.fields || []) {
    if (!isEditableDocusealField(field)) continue;
    values[field.uuid] =
      typeof field.default_value === "string"
        ? field.default_value
        : field.default_value
          ? String(field.default_value)
          : "";
  }

  return values;
}

export function getTemplateSubmitterGroups(
  template: DocusealTemplate | undefined,
  fieldValues: Record<string, string>,
) {
  if (!template) {
    return [];
  }

  const editableFields = (template.fields || []).filter(isEditableDocusealField);
  const groupedFields = editableFields.reduce<Record<string, DocusealField[]>>(
    (acc, field) => {
      const submitterUuid = field.submitter_uuid || "unknown";
      if (!acc[submitterUuid]) {
        acc[submitterUuid] = [];
      }
      acc[submitterUuid].push(field);
      return acc;
    },
    {},
  );

  return (template.submitters || []).map((submitter) => ({
    submitterUuid: submitter.uuid,
    submitterName: submitter.name || "Submitter",
    fields: (groupedFields[submitter.uuid] || []).filter((field) => {
      const value = getDocusealFieldValue(fieldValues, field);
      return field.required || value !== "";
    }),
  }));
}

export function getMissingRequiredDocusealFields(
  template: DocusealTemplate | undefined,
  fieldValues: Record<string, string>,
) {
  if (!template) return [];

  return (template.fields || []).filter((field) => {
    if (!isEditableDocusealField(field) || !field.required) {
      return false;
    }

    return !getDocusealFieldValue(fieldValues, field).trim();
  });
}
