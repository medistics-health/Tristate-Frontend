/**
 * Formats a Date object or date string into standard US Date format:
 * MM/DD/YYYY (e.g. "08/18/2026")
 */
export function formatUsDate(dateInput?: string | Date | number | null): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();

  return `${month}/${day}/${year}`;
}

/**
 * Formats a Date object or date string into standard US Date & Time format:
 * MM/DD/YYYY hh:mm:ss AM/PM (e.g. "08/18/2026 12:35:42 PM")
 */
export function formatUsDateTime(dateInput?: string | Date | number | null): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // hour '0' should be '12'
  const formattedHours = String(hours).padStart(2, "0");

  return `${month}/${day}/${year} ${formattedHours}:${minutes}:${seconds} ${ampm}`;
}

/**
 * Builds a clean, professional filename for exported CSVs with US date and timestamp
 */
export function buildExportFilename(moduleName: string): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");

  const cleanModule = moduleName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return `${cleanModule}_export_${month}-${day}-${year}_${hours}${mins}.csv`;
}

/**
 * Helper to fetch all pages sequentially with 50 items per page request,
 * collect all records matching current active filters, and trigger a CSV download.
 */
export async function exportAllPagesToCsv<T>({
  filenamePrefix,
  headers,
  fetchPage,
  rowToCsvFields,
  pageSize = 50,
}: {
  filenamePrefix: string;
  headers: string[];
  fetchPage: (page: number, limit: number) => Promise<{ items: T[]; totalPages: number }>;
  rowToCsvFields: (item: T) => (string | number | boolean | null | undefined)[];
  pageSize?: number;
}): Promise<void> {
  const allItems: T[] = [];
  let currentPage = 1;
  let totalPages = 1;

  do {
    const result = await fetchPage(currentPage, pageSize);
    allItems.push(...result.items);
    totalPages = result.totalPages || 1;
    currentPage++;
  } while (currentPage <= totalPages);

  const csvRows: string[] = [];
  csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","));

  for (const item of allItems) {
    const fields = rowToCsvFields(item);
    const formattedFields = fields.map((val) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    csvRows.push(formattedFields.join(","));
  }

  const csvContent = "\uFEFF" + csvRows.join("\n"); // UTF-8 BOM
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", buildExportFilename(filenamePrefix));
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
