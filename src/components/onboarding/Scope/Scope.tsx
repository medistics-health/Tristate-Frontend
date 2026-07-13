import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { createExternalOnboardingFromForm } from "../../../services/operations/createOnboardingForm";
import {
  getAgreementsByPractice,
  sendOnboardingFormApi,
  type Agreement,
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
    // value: "PATIENT_ACQUISITION/BRAND_GROWTH",
    value: "PATIENT_ACQUISITION_BRAND_GROWTH",
  },
  // { label: "Brand Growth", value: "BRAND_GROWTH" },
  {
    label: "MSP/Tech Support",
    // value: "MSP/TECH_SUPPORT"
    value: "MSP_TECH_SUPPORT",
  },
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

export default function Scope() {
  const navigate = useNavigate();
  const [scope, setScope] = useState<ScopeFormState>(initialScopeState);
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
  const [practiceAgreementServiceValues, setPracticeAgreementServiceValues] =
    useState<string[]>([]);
  const [practiceServiceVendors, setPracticeServiceVendors] = useState<
    Record<string, { vendorId: string | null }>
  >({});
  const [selectedAgreementId, setSelectedAgreementId] = useState("");
  const [practiceAgreements, setPracticeAgreements] = useState<Agreement[]>([]);
  const requestedGoLiveDatePickerRef = useRef<HTMLInputElement | null>(null);

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
      setPracticeAgreementServiceValues([]);
      setPracticeServiceVendors({});
      setSelectedAgreementId("");
      setPracticeAgreements([]);
      return;
    }

    let active = true;
    async function loadPracticeData() {
      try {
        const [practice, agreements] = await Promise.all([
          getPractice(selectedPracticeId),
          getAgreementsByPractice(selectedPracticeId),
        ]);
        if (!active) return;
        setSelectedPractice(practice);
        const signedAgreements = agreements.filter(
          (a) => a.status === "SIGNED",
        );
        setPracticeAgreements(signedAgreements);

        if (signedAgreements.length === 1) {
          setSelectedAgreementId(signedAgreements[0].id);
        } else {
          setSelectedAgreementId("");
        }

        const signedAgreement = [...agreements]
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          )
          .find((agreement) => agreement.status === "SIGNED");

        if (signedAgreement?.services?.length) {
          const serviceNames = signedAgreement.services.map((s) =>
            s.name.toLowerCase(),
          );
          const matchedValues = serviceOptions
            .filter((opt) => serviceNames.includes(opt.label.toLowerCase()))
            .map((opt) => opt.value);

          const vendorMap: Record<string, { vendorId: string | null }> = {};
          for (const svc of signedAgreement.services) {
            const lowerName = svc.name.toLowerCase();
            const matchedOpt = serviceOptions.find(
              (opt) => opt.label.toLowerCase() === lowerName,
            );
            if (matchedOpt) {
              vendorMap[matchedOpt.value] = {
                vendorId: (svc as any).vendorId ?? null,
              };
            }
          }

          setPracticeAgreementServiceValues(matchedValues);
          setPracticeServiceVendors(vendorMap);
          setScope((prev) => ({
            ...prev,
            requestedServices: matchedValues,
          }));
        } else {
          setPracticeAgreementServiceValues([]);
          setPracticeServiceVendors({});
          setScope((prev) => ({
            ...prev,
            requestedServices: [],
          }));
        }
      } catch (error) {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load practice data.",
        );
      }
    }
    void loadPracticeData();
    return () => {
      active = false;
    };
  }, [selectedPracticeId]);

  function validateScope() {
    return true;
  }

  async function handleSendToPracticePerson() {
    if (!validateScope()) return;
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
        .filter(
          (service) =>
            practiceServiceVendors[service]?.vendorId,
        )
        .map((service) => {
          const svcVendor = practiceServiceVendors[service];
          const vendorName = svcVendor?.vendorId
            ? (vendors.find((v) => v.id === svcVendor.vendorId)?.name ?? "")
            : "";
          return { service, vendorName };
        });
      const replacingExistingVendor = selectedVendorEntries.length > 0;
      const currentVendorName = selectedVendorEntries
        .map((entry) => {
          const serviceLabel =
            serviceLabelMap.get(entry.service) ?? entry.service;
          return `${serviceLabel}: ${entry.vendorName}`;
        })
        .join("; ");
      const currentVendorEndDate = "";
      const vendorSummary = selectedVendorEntries.length
        ? selectedVendorEntries
            .map((entry) => {
              const serviceLabel =
                serviceLabelMap.get(entry.service) ?? entry.service;
              return `- ${serviceLabel}: ${entry.vendorName}`;
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
      const agreementForOnboarding = selectedAgreementId
        ? agreements.find((a) => a.id === selectedAgreementId)
        : [...agreements]
            .sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime(),
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
        agreementId: agreementForOnboarding.id,
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

        {/* Practice & Person */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Practice &amp; Contact
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Practice *
              </label>
              <select
                value={selectedPracticeId}
                onChange={(event) => {
                  setSelectedPracticeId(event.target.value);
                  setSelectedPersonId("");
                }}
                disabled={isLoadingSignedPractices}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
              {!isLoadingSignedPractices && !availableScopePractices.length ? (
                <p className="mt-1.5 text-xs text-amber-700">
                  No practices found with a signed agreement.
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Practice person *
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedPersonId}
                  onChange={(event) => setSelectedPersonId(event.target.value)}
                  disabled={!selectedPracticeId}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
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
                <p className="mt-1.5 text-xs text-amber-700">
                  No ADMIN or OWNER person is linked to this practice.
                </p>
              ) : null}
              {selectedPracticeId ? (
                <button
                  type="button"
                  onClick={() => navigate("/people/all-peoples")}
                  className="mt-1.5 text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-800"
                >
                  Manage / Add Contact
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {/* Agreement */}
        {selectedPracticeId && practiceAgreements.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Agreement
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select the agreement for this practice.
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Agreement *
              </label>
              <select
                value={selectedAgreementId}
                onChange={(event) => setSelectedAgreementId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select agreement</option>
                {practiceAgreements.map((agreement) => (
                  <option key={agreement.id} value={agreement.id}>
                    {agreement.practice?.name || "Practice"} - {agreement.type} ({agreement.status})
                  </option>
                ))}
              </select>
              {practiceAgreements.length === 1 ? (
                <p className="mt-1.5 text-xs text-slate-500">
                  Auto-selected — only one agreement found for this practice.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Services & Vendor */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Services in Scope
            </h2>
            {practiceAgreementServiceValues.length > 0 ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {practiceAgreementServiceValues.length} service
                {practiceAgreementServiceValues.length !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>

          {selectedPracticeId && practiceAgreementServiceValues.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <div className="flex items-center justify-between bg-slate-50 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Service
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Vendor
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {practiceAgreementServiceValues.map((service) => {
                  const svcVendor = practiceServiceVendors[service];
                  const vendorName = svcVendor?.vendorId
                    ? (vendors.find((v) => v.id === svcVendor.vendorId)
                        ?.name ?? "Unknown vendor")
                    : null;
                  return (
                    <div
                      key={service}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-800">
                          {serviceLabelMap.get(service) ?? service}
                        </span>
                      </div>
                      {vendorName ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                          <svg
                            className="h-3 w-3 text-indigo-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
                            />
                          </svg>
                          {vendorName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-400">
                          No vendor
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              {selectedPracticeId
                ? "No services found in the practice's signed agreement."
                : "Select a practice above to see its agreement services."}
            </p>
          )}

          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Requested go-live date
            </label>
            <div className="relative max-w-xs">
              <input
                type="text"
                value={requestedGoLiveDateDisplay}
                readOnly
                onClick={openRequestedGoLiveDatePicker}
                placeholder="MM/DD/YYYY"
                className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 pr-28 text-sm"
              />
              <button
                type="button"
                onClick={openRequestedGoLiveDatePicker}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100"
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
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSendToPracticePerson()}
            disabled={isSending}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-70"
          >
            {isSending ? "Sending..." : "Send Onboarding"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
