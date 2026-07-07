import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { createExternalOnboardingFromForm } from "../../../services/operations/createOnboardingForm";
import {
  getAgreementsByPractice,
  sendOnboardingFormApi,
} from "../../../services/operations/agreements";
import type { OnboardingBody } from "../../../services/operations/onboarding";
import {
  getAllPractices,
  getPractice,
} from "../../../services/operations/practices";
import { getAllVendorsApi } from "../../../services/operations/vendors";
import type { Vendor } from "../../vendors/types";
import AppLayout from "../../layout/AppLayout";
import type { Practice } from "../../practices/types";

type Option = { label: string; value: string };

type ScopeFormState = Pick<
  OnboardingBody,
  | "requestedServices"
  | "requestedGoLiveDate"
  | "servicesForAllPractices"
  | "selectedPractices"
  | "replacingExistingVendor"
  | "currentVendorName"
  | "currentVendorEndDate"
  | "engagementGoals"
>;
type ServiceVendorDetail = {
  hasExistingVendor: boolean;
  vendorName: string;
  vendorEndDate: string;
};

const serviceOptions: Option[] = [
  { label: "Credentialing", value: "CREDENTIALING" },
  { label: "Billing / Revenue Cycle Management", value: "BILLING_RCM" },
  // { label: "APCM", value: "APCM" },
  // { label: "CCM", value: "CCM" },
  // { label: "RPM", value: "RPM" },
  // { label: "PCM", value: "PCM" },
  // { label: "RTM", value: "RTM" },
  // { label: "BHI", value: "BHI" },
  // { label: "TCM", value: "TCM" },
  { label: "Care Management", value: "CARE_MANAGEMENT" },
  { label: "Lab Relationship Support", value: "LAB_RELATIONSHIP_SUPPORT" },
  // { label: "Pharmacy Program Support", value: "PHARMACY_PROGRAM_SUPPORT" },
  {
    label: "Patient Acquisition/Brand Growth",
    value: "PATIENT_ACQUISITION/BRAND_GROWTH",
  },
  // { label: "Brand Growth", value: "BRAND_GROWTH" },
  { label: "MSP/Tech Support", value: "MSP/TECH_SUPPORT" },
  { label: "AI Visibility", value: "AI_VISIBILITY" },
  { label: "Other", value: "OTHER" },
];

/*
const serviceCoverageOptions: Option[] = [
  { label: "All practices", value: "ALL_PRACTICES" },
  { label: "Selected practices", value: "SELECTED_PRACTICES" },
  { label: "Single practice only", value: "SINGLE_PRACTICE_ONLY" },
];
*/

const initialScopeState: ScopeFormState = {
  requestedServices: [],
  requestedGoLiveDate: "",
  servicesForAllPractices: "",
  selectedPractices: [],
  replacingExistingVendor: false,
  currentVendorName: "",
  currentVendorEndDate: "",
  engagementGoals: "",
};

function formatDateForDisplay(dateValue: string) {
  if (!dateValue) return "";
  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) return dateValue;
  return `${month}/${day}/${year}`;
}

function formatDateShortForDisplay(dateValue: string) {
  if (!dateValue) return "";
  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) return dateValue;
  return `${month}/${day}/${year.slice(-2)}`;
}

export default function Scope() {
  const navigate = useNavigate();
  const [scope, setScope] = useState<ScopeFormState>(initialScopeState);
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [signedPracticeIds, setSignedPracticeIds] = useState<string[]>([]);
  const [isLoadingSignedPractices, setIsLoadingSignedPractices] =
    useState(false);
  const [selectedPracticeId, setSelectedPracticeId] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [selectedPractice, setSelectedPractice] = useState<Practice | null>(
    null,
  );
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [serviceVendors, setServiceVendors] = useState<
    Record<string, ServiceVendorDetail>
  >({});
  const requestedGoLiveDatePickerRef = useRef<HTMLInputElement | null>(null);
  const vendorEndDatePickerRefs = useRef<
    Record<string, HTMLInputElement | null>
  >({});

  const selectedServices = useMemo(
    () => scope.requestedServices ?? [],
    [scope.requestedServices],
  );

  const requestedGoLiveDateDisplay = useMemo(
    () => formatDateForDisplay(scope.requestedGoLiveDate ?? ""),
    [scope.requestedGoLiveDate],
  );
  const serviceLabelMap = useMemo(
    () => new Map(serviceOptions.map((option) => [option.value, option.label])),
    [],
  );

  function openRequestedGoLiveDatePicker() {
    const pickerInput = requestedGoLiveDatePickerRef.current;
    if (!pickerInput) return;
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }
    pickerInput.focus();
    pickerInput.click();
  }

  function openVendorEndDatePicker(service: string) {
    const pickerInput = vendorEndDatePickerRefs.current[service];
    if (!pickerInput) return;
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }
    pickerInput.focus();
    pickerInput.click();
  }

  const availableScopePractices = useMemo(
    () =>
      practices.filter((practice) => signedPracticeIds.includes(practice.id)),
    [practices, signedPracticeIds],
  );
  const eligiblePracticePersons = useMemo(
    () =>
      (selectedPractice?.persons ?? []).filter((person) =>
        ["ADMIN", "OWNER"].includes(person.role),
      ),
    [selectedPractice?.persons],
  );

  useEffect(() => {
    setServiceVendors((prev) => {
      const next: Record<string, ServiceVendorDetail> = {};
      selectedServices.forEach((service) => {
        next[service] = prev[service] ?? {
          hasExistingVendor: false,
          vendorName: "",
          vendorEndDate: "",
        };
      });
      return next;
    });
  }, [selectedServices]);

  useEffect(() => {
    if (practices.length) return;
    let active = true;
    async function loadPractices() {
      try {
        const allPractices = await getAllPractices();
        if (!active) return;
        setPractices(allPractices);
      } catch (error) {
        if (!active) return;
        toast.error(
          error instanceof Error ? error.message : "Unable to fetch practices.",
        );
      }
    }

    void loadPractices();
    return () => {
      active = false;
    };
  }, [practices.length]);

  useEffect(() => {
    let active = true;

    async function loadVendors() {
      try {
        const vendorList = await getAllVendorsApi();
        if (!active) return;
        setVendors(vendorList);
      } catch (error) {
        if (!active) return;
        toast.error(
          error instanceof Error ? error.message : "Unable to fetch vendors.",
        );
      }
    }

    void loadVendors();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!practices.length) {
      setSignedPracticeIds([]);
      return;
    }

    let active = true;
    async function loadSignedPracticeIds() {
      setIsLoadingSignedPractices(true);
      try {
        const signedIds = (
          await Promise.all(
            practices.map(async (practice) => {
              try {
                const agreements = await getAgreementsByPractice(practice.id);
                return agreements.some(
                  (agreement) => agreement.status === "SIGNED",
                )
                  ? practice.id
                  : null;
              } catch {
                return null;
              }
            }),
          )
        ).filter((id): id is string => Boolean(id));
        if (!active) return;
        setSignedPracticeIds(signedIds);
      } finally {
        if (active) setIsLoadingSignedPractices(false);
      }
    }

    void loadSignedPracticeIds();
    return () => {
      active = false;
    };
  }, [practices]);

  useEffect(() => {
    if (!selectedPracticeId) return;
    if (
      availableScopePractices.some(
        (practice) => practice.id === selectedPracticeId,
      )
    ) {
      return;
    }
    setSelectedPracticeId("");
    setSelectedPersonId("");
    setSelectedPractice(null);
  }, [availableScopePractices, selectedPracticeId]);

  useEffect(() => {
    if (!selectedPracticeId) {
      setSelectedPractice(null);
      setSelectedPersonId("");
      return;
    }

    let active = true;
    async function loadPracticeContacts() {
      try {
        const practice = await getPractice(selectedPracticeId);
        if (!active) return;
        setSelectedPractice(practice);
      } catch (error) {
        if (!active) return;
        toast.error(
          error instanceof Error ? error.message : "Unable to load practice.",
        );
      }
    }
    void loadPracticeContacts();
    return () => {
      active = false;
    };
  }, [selectedPracticeId]);

  function toggleService(value: string) {
    setScope((prev) => {
      const existing = prev.requestedServices ?? [];
      const hasValue = existing.includes(value);
      const nextValues = hasValue
        ? existing.filter((item) => item !== value)
        : [...existing, value];

      return {
        ...prev,
        requestedServices: nextValues,
      };
    });
  }

  function updateServiceVendor(
    service: string,
    changes: Partial<ServiceVendorDetail>,
  ) {
    setServiceVendors((prev) => ({
      ...prev,
      [service]: {
        hasExistingVendor: false,
        vendorName: "",
        vendorEndDate: "",
        ...prev[service],
        ...changes,
      },
    }));
  }

  function validateScope() {
    if (!selectedServices.length) {
      toast.error("Select at least one requested service.");
      return false;
    }
    // Scope coverage and practices-in-scope checks removed by request.
    const invalidVendorEntry = selectedServices.find((service) => {
      const detail = serviceVendors[service];
      return detail?.hasExistingVendor && !detail.vendorName.trim();
    });
    if (invalidVendorEntry) {
      toast.error(
        `Vendor name is required for ${serviceLabelMap.get(invalidVendorEntry) ?? invalidVendorEntry}.`,
      );
      return false;
    }
    // Scope coverage removed by request; no longer required.
    return true;
  }

  function openSendModal() {
    if (!validateScope()) return;
    if (!availableScopePractices.length) {
      toast.error(
        "No practice has a signed agreement available for onboarding.",
      );
      return;
    }
    setIsPracticeModalOpen(true);
  }

  async function handleSendToPracticePerson() {
    if (!selectedPracticeId) {
      toast.error("Select a practice.");
      return;
    }
    if (!selectedPersonId) {
      toast.error("Select a practice person.");
      return;
    }

    setIsSending(true);
    const loadingToast = toast.loading("Creating onboarding and sending...");

    try {
      const selectedVendorEntries = selectedServices
        .map((service) => ({
          service,
          ...serviceVendors[service],
        }))
        .filter((entry) => entry.hasExistingVendor);
      const replacingExistingVendor = selectedVendorEntries.length > 0;
      const currentVendorName = selectedVendorEntries
        .map((entry) => {
          const serviceLabel =
            serviceLabelMap.get(entry.service) ?? entry.service;
          return `${serviceLabel}: ${entry.vendorName.trim()}`;
        })
        .join("; ");
      const currentVendorEndDate =
        selectedVendorEntries.find((entry) => entry.vendorEndDate)
          ?.vendorEndDate ?? "";
      const vendorSummary = selectedVendorEntries.length
        ? selectedVendorEntries
            .map((entry) => {
              const serviceLabel =
                serviceLabelMap.get(entry.service) ?? entry.service;
              const datePart = entry.vendorEndDate
                ? ` (end date: ${entry.vendorEndDate})`
                : "";
              return `- ${serviceLabel}: ${entry.vendorName.trim()}${datePart}`;
            })
            .join("\n")
        : "";
      const combinedEngagementGoals = [
        scope.engagementGoals?.trim() ?? "",
        vendorSummary ? `Vendor by requested service:\n${vendorSummary}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const agreements = await getAgreementsByPractice(selectedPracticeId);
      const agreementForOnboarding = [...agreements]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .find((agreement) => agreement.status === "SIGNED");

      if (!agreementForOnboarding?.id) {
        throw new Error(
          "No agreement found for this practice with status signed.",
        );
      }

      await createExternalOnboardingFromForm({
        practiceId: selectedPracticeId,
        personId: selectedPersonId,
        requestedServices: selectedServices,
        requestedGoLiveDate: scope.requestedGoLiveDate,
        servicesForAllPractices: scope.servicesForAllPractices || undefined,
        selectedPractices: scope.selectedPractices ?? [],
        replacingExistingVendor,
        currentVendorName: replacingExistingVendor ? currentVendorName : "",
        currentVendorEndDate: replacingExistingVendor
          ? currentVendorEndDate
          : "",
        engagementGoals: combinedEngagementGoals,
        status: "DRAFT",
      });

      const onboardingUrl = `${window.location.origin}/onboarding/${selectedPracticeId}`;

      await sendOnboardingFormApi({
        agreementId: agreementForOnboarding.id,
        personId: selectedPersonId,
        formLink: onboardingUrl,
      });

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(onboardingUrl);
      }

      toast.success("Onboarding sent. Link copied to clipboard.", {
        id: loadingToast,
      });
      setIsPracticeModalOpen(false);
      setSelectedPersonId("");
      setSelectedPracticeId("");
      setSelectedPractice(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to send onboarding.",
        { id: loadingToast },
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AppLayout
      title="Scope Setup"
      activeModule="Onboarding"
      activeSubItem="Scope Setup"
    >
      <div className="mx-auto max-w-5xl space-y-6 p-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Scope Setup</h1>
          <p className="mt-2 text-sm text-slate-600">
            Configure scope once, then select a practice and person to send the
            onboarding form. Client onboarding fields are filtered based on this
            scope.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Services Requested / Scope
          </h2>
          <div className="mt-4 space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Which services are requested? *
              </label>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {serviceOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(option.value)}
                      onChange={() => toggleService(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Requested go-live date
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={requestedGoLiveDateDisplay}
                    readOnly
                    onClick={openRequestedGoLiveDatePicker}
                    placeholder="MM/DD/YYYY"
                    className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 pr-28 text-sm"
                  />
                  <button
                    type="button"
                    onClick={openRequestedGoLiveDatePicker}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    Pick
                  </button>
                  <input
                    ref={requestedGoLiveDatePickerRef}
                    type="date"
                    value={scope.requestedGoLiveDate ?? ""}
                    onChange={(event) =>
                      setScope((prev) => ({
                        ...prev,
                        requestedGoLiveDate: event.target.value,
                      }))
                    }
                    tabIndex={-1}
                    aria-hidden="true"
                    className="pointer-events-none absolute h-0 w-0 opacity-0"
                  />
                </div>
              </div>
            </div>

            {/* Scope coverage and practices in scope are intentionally removed.
                Keeping this commented block for future reference.
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Scope coverage *
              </label>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Practices in scope *
              </label>
            </div>
            */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Vendor by requested service
              </label>
              <div className="space-y-3">
                {selectedServices.length ? (
                  selectedServices.map((service) => {
                    const detail = serviceVendors[service] ?? {
                      hasExistingVendor: false,
                      vendorName: "",
                      vendorEndDate: "",
                    };
                    return (
                      <div
                        key={service}
                        className="rounded-xl border border-slate-200 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-800">
                            {serviceLabelMap.get(service) ?? service}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <label className="flex items-center gap-2 text-slate-700">
                              <input
                                type="radio"
                                name={`vendor-${service}`}
                                checked={detail.hasExistingVendor === true}
                                onChange={() =>
                                  updateServiceVendor(service, {
                                    hasExistingVendor: true,
                                  })
                                }
                              />
                              <span>Existing vendor</span>
                            </label>
                            <label className="flex items-center gap-2 text-slate-700">
                              <input
                                type="radio"
                                name={`vendor-${service}`}
                                checked={detail.hasExistingVendor === false}
                                onChange={() =>
                                  updateServiceVendor(service, {
                                    hasExistingVendor: false,
                                    vendorName: "",
                                    vendorEndDate: "",
                                  })
                                }
                              />
                              <span>None</span>
                            </label>
                          </div>
                        </div>

                        {detail.hasExistingVendor ? (
                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-1">
                            <select
                              value={detail.vendorName}
                              onChange={(event) =>
                                updateServiceVendor(service, {
                                  vendorName: event.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                            >
                              <option value="">Select vendor</option>
                              {vendors.map((vendor) => (
                                <option key={vendor.id} value={vendor.name}>
                                  {vendor.name}
                                </option>
                              ))}
                            </select>
                            {/*<div className="relative">
                              <input
                                type="text"
                                value={formatDateShortForDisplay(
                                  detail.vendorEndDate,
                                )}
                                readOnly
                                onClick={() => openVendorEndDatePicker(service)}
                                placeholder="MM/DD/YY"
                                className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 pr-20 text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => openVendorEndDatePicker(service)}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                              >
                                Pick
                              </button>
                              <input
                                ref={(element) => {
                                  vendorEndDatePickerRefs.current[service] =
                                    element;
                                }}
                                type="date"
                                value={detail.vendorEndDate}
                                onChange={(event) =>
                                  updateServiceVendor(service, {
                                    vendorEndDate: event.target.value,
                                  })
                                }
                                tabIndex={-1}
                                aria-hidden="true"
                                className="pointer-events-none absolute h-0 w-0 opacity-0"
                              />
                            </div>*/}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Select requested services first to configure vendor details.
                  </p>
                )}
              </div>
            </div>

            <div>
              {/*<label className="mb-2 block text-sm font-medium text-slate-700">
                Engagement goals
              </label>
              <textarea
                value={scope.engagementGoals ?? ""}
                onChange={(event) =>
                  setScope((prev) => ({
                    ...prev,
                    engagementGoals: event.target.value,
                  }))
                }
                rows={4}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />*/}
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={openSendModal}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Create Scope & Select Practice
          </button>
        </div>
      </div>

      {isPracticeModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Send onboarding form
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Choose practice and contact person to send this scoped onboarding.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Practice *
                </label>
                <select
                  value={selectedPracticeId}
                  onChange={(event) => {
                    setSelectedPracticeId(event.target.value);
                    setSelectedPersonId("");
                  }}
                  disabled={isLoadingSignedPractices}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">
                    {isLoadingSignedPractices
                      ? "Loading practices..."
                      : "Select practice"}
                  </option>
                  {availableScopePractices.map((practice) => (
                    <option key={practice.id} value={practice.id}>
                      {practice.name}
                    </option>
                  ))}
                </select>
                {!isLoadingSignedPractices &&
                !availableScopePractices.length ? (
                  <p className="mt-2 text-xs text-amber-700">
                    No practices found with a signed agreement.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Practice person *
                </label>
                <select
                  value={selectedPersonId}
                  onChange={(event) => setSelectedPersonId(event.target.value)}
                  disabled={!selectedPracticeId}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                >
                  <option value="">Select person</option>
                  {eligiblePracticePersons.map((person) => (
                    <option key={person.id} value={person.id}>
                      {[person.firstName, person.lastName]
                        .filter(Boolean)
                        .join(" ") ||
                        person.email ||
                        "Contact"}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPracticeId && !eligiblePracticePersons.length ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  No ADMIN or OWNER person is linked to this practice. Add an
                  eligible contact first, then send onboarding.
                </p>
              ) : null}

              {selectedPracticeId ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsPracticeModalOpen(false);
                    navigate("/people/all-peoples");
                  }}
                  className="text-sm font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900"
                >
                  Manage / Add Contact
                </button>
              ) : null}

              <p className="text-xs text-slate-500">
                On send, onboarding is created/updated in draft and link is
                copied to clipboard.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPracticeModalOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSendToPracticePerson()}
                disabled={isSending}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
              >
                {isSending ? "Sending..." : "Send Onboarding"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
