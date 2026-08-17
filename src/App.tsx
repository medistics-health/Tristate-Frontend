import { Navigate, Route, Routes, useParams } from "react-router-dom";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import RoleRoute from "./components/auth/RoleRoute";
import AllAgreementsPage from "./components/agreements/all-agreements/AllAgreements";
import AgreementPendingApprovalPage from "./components/agreements/pending-approval/AgreementPendingApprovalPage";
import AllPracticeAuditsPage from "./components/audits/AllPracticeAudits";
import Audits from "./components/audits/Audits";
import AuditStatusBoard from "./components/audits/AuditStatusBoard";
import AllPurchaseOrdersPage from "./components/purchase-orders/AllPurchaseOrders";
import PendingApprovalPage from "./components/purchase-orders/PendingApprovalPage";
import PurchaseOrdersPage from "./components/purchase-orders/PurchaseOrdersPage";
import PurchaseOrderStatusBoardPage from "./components/purchase-orders/PurchaseOrderStatusBoardPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import CRMDashboardPage from "./components/dashoard/CRMDashboard";
import AssessmentsPage from "./components/assessments/AllAssessments";
import AllInvoiceLineItems from "./components/invoice-line-items/AllInvoiceLineItems";
import AllServices from "./components/services/AllServices";
import ServiceCatalogPage from "./components/services/ServiceCatalog";
import ActiveServicePage from "./components/services/ActiveServices";
import AllChannelPartnersPage from "./components/channel-partners/AllChannelPartners";
import AllPartnersPage from "./components/channel-partners/AllPartners";
import AssessmentProgressPage from "./components/assessments/AssessmentProgress";
import InvoiceStatusBoardPage from "./components/invoices/InvoiceStatusBoard";
import AllInvoicePage from "./components/invoices/AllInvoices";
import StripePayoutTracker from "./components/invoices/StripePayoutTracker";
import AgreementPendingSignaturesPage from "./components/agreements/pending-signatures/PendingSignatures";
import AgreementPendingSubmissionChangesPage from "./components/agreements/pending-submission-changes/AgreementPendingSubmissionChangesPage";
import VendorContractPage from "./components/vendors/VendorContracts";
import AllVendorsPage from "./components/vendors/AllVendors";
import PipelineBoardPage from "./components/practices/PipelineBoard";
import AllPracticePage from "./components/practices/AllPractice";
import ActivePracticesPage from "./components/practices/ActivePractices";
import ProspectsPage from "./components/practices/Prospects";
import PracticeProfilePage from "./components/practices/PracticeProfile";
import ReminderDuePage from "./components/practices/RemindersDue";
import OverdueInvoicePage from "./components/invoices/OverdueInvoices";
import BillingRunsPage from "./components/billing/BillingRuns";
import BillingStatusBoardPage from "./components/billing/BillingStatusBoard";
import DealsPage from "./components/deal/Deals";
import PersonsPage from "./components/contact/Persons";
import AllCompaniesPage from "./components/companies/AllCompanies";
import AgreementPipelinePage from "./components/agreements/agreements-pipeline/AgreementPipeline";
import DocumentSigningPage from "./components/shared/DocumentSigningPage";
import AdminOnboardingReview from "./components/onboarding/AdminOnboardingReview";
import AllScopeOnboardings from "./components/onboarding/Scope/AllScopeOnboardings";
import Scope from "./components/onboarding/Scope/Scope";
import MonthlyReportingDashboard from "./components/monthly-reporting/MonthlyReportingDashboard";
import SubmitMonthlyReport from "./components/monthly-reporting/SubmitMonthlyReport";
import PricingEnginePage from "./components/pricing-terms/PricingEngine";
import AccountingSyncDashboard from "./components/integrations/AccountingSyncDashboard";
import MercuryBankingDashboard from "./components/integrations/MercuryBankingDashboard";
import VendorPayableDashboard from "./components/payables/VendorPayableDashboard";
import PayVendorPayable from "./components/payables/PayVendorPayable";
import ClientPortalDashboard from "./components/portal/ClientPortalDashboard";
import SettingsPage from "./components/settings/Settings";
import CreateLeadPage from "./components/leads/CreateLead";
import type { JSX, ReactNode } from "react";
import OnboardingFormV6 from "./components/onboarding/OnboardingFormV6";
import { BUSINESS_WRITE_ROLES, MODULE_ACCESS } from "./utils/auth";
import CredentialingDashboardPage from "./components/credentialing/CredentialingDashboard";
import CredentialingListPage from "./components/credentialing/CredentialingList";
import CommunicationPage from "./components/communication/Communication";

function App() {
  function ModuleRoute({
    children,
    allowedRoles,
  }: {
    children: ReactNode;
    allowedRoles: readonly (
      "ADMIN" | "SALES" | "ACCOUNTMANAGER" | "OPERATIONS" | "FINANCE" | "VIEWER"
    )[];
  }) {
    return (
      <ProtectedRoute>
        <RoleRoute allowedRoles={[...allowedRoles]}>
          {children as JSX.Element}
        </RoleRoute>
      </ProtectedRoute>
    );
  }

  function UUIDProtectedRoute({ children }: { children: ReactNode }) {
    const { id } = useParams();

    const isValidUUID = (id: string | any) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        id,
      );

    if (!id || !isValidUUID(id)) {
      return <Navigate to="/404" replace />;
    }

    return children;
  }

  function SignPage({ children }: { children: ReactNode }) {
    const url = useParams();
    const token = url?.slug as string;

    const isValidSignToken = (token: string) =>
      /^[A-Za-z0-9]{10,20}$/.test(token);

    if (!token || !isValidSignToken(token)) {
      return <Navigate to="/404" replace />;
    }

    return children;
  }

  const isOnboardingPage = localStorage.getItem("onBoardingId");
  const isSignDocPage = localStorage.getItem("documentId");

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      {(!isOnboardingPage || !isSignDocPage) && (
        <Route path="/signup" element={<Signup />} />
      )}
      <Route
        path="/onboarding/:id"
        element={
          <UUIDProtectedRoute>
            {/*<OnboardingForm />*/}
            <OnboardingFormV6 />
          </UUIDProtectedRoute>
        }
      />

      <Route
        path="/onboarding/review"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <AdminOnboardingReview />
          </ModuleRoute>
        }
      />

      <Route
        path="/onboarding/scope"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <Scope />
          </ModuleRoute>
        }
      />

      <Route
        path="/onboarding/scope-list"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <AllScopeOnboardings />
          </ModuleRoute>
        }
      />

      <Route
        path="/sign/:slug"
        element={
          <SignPage>
            <DocumentSigningPage />
          </SignPage>
        }
      />
      <Route
        path="/audit/all-practice-audits"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <AllPracticeAuditsPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/audit/all-audits"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <Audits />
          </ModuleRoute>
        }
      />

      <Route
        path="/audit/status-board"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <AuditStatusBoard />
          </ModuleRoute>
        }
      />

      <Route
        path="/purchase-orders/all"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <AllPurchaseOrdersPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/purchase-orders/status-board"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <PurchaseOrderStatusBoardPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/purchase-orders/pending-approval"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <PendingApprovalPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/purchase-orders/unpaid-pos"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <PurchaseOrdersPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <CRMDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/integrations/accounting-sync"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.INTEGRATIONS}>
            <AccountingSyncDashboard />
          </ModuleRoute>
        }
      />

      <Route
        path="/integrations/mercury-banking"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.INTEGRATIONS}>
            <MercuryBankingDashboard />
          </ModuleRoute>
        }
      />

      <Route
        path="/vendors/payables"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <VendorPayableDashboard />
          </ModuleRoute>
        }
      />

      <Route
        path="/vendors/payables/pay/:id"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <PayVendorPayable />
          </ModuleRoute>
        }
      />

      <Route
        path="/portal"
        element={
          <ProtectedRoute>
            <ClientPortalDashboard />
          </ProtectedRoute>
        }
      />

      {/*<Route
        path="/dashboard/crm"
        element={
          <ProtectedRoute>
            <CRMDashboardPage />
          </ProtectedRoute>
        }
      />*/}

      <Route
        path="/agreements/all-agreements"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <AllAgreementsPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/agreements/pipeline"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <AgreementPipelinePage />
          </ModuleRoute>
        }
      />

      <Route
        path="/agreements/pending-approval"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.ADMIN_ONLY}>
            <AgreementPendingApprovalPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/invoice/overdue"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <OverdueInvoicePage />
          </ModuleRoute>
        }
      />

      <Route
        path="/agreements/pending-signatures"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <AgreementPendingSignaturesPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/agreements/pending-submission-changes"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.ADMIN_ONLY}>
            <AgreementPendingSubmissionChangesPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/invoice/client-invoice-line-items"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <AllInvoiceLineItems viewMode="client" />
          </ModuleRoute>
        }
      />
      <Route
        path="/invoice/tristate-invoice-line-items"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <AllInvoiceLineItems viewMode="tristate" />
          </ModuleRoute>
        }
      />
      <Route
        path="/service/all-services"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <AllServices />
          </ModuleRoute>
        }
      />

      <Route
        path="/service/service-catalogs"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <ServiceCatalogPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/service/active-services"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <ActiveServicePage />
          </ModuleRoute>
        }
      />

      <Route
        path="/partner/all-channel-partners"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <AllChannelPartnersPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/partner/all-partners"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <AllPartnersPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/assessment/all-assessments"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <AssessmentsPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/assessment/progress"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <AssessmentProgressPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/invoice/all-invoices"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <AllInvoicePage />
          </ModuleRoute>
        }
      />

      <Route
        path="/invoice/status-board"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <InvoiceStatusBoardPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/invoice/stripe-payouts"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <StripePayoutTracker />
          </ModuleRoute>
        }
      />

      <Route
        path="/billing/runs"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <BillingRunsPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/billing/status-board"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <BillingStatusBoardPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/vendors/all-vendors"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <AllVendorsPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/vendors/contracts"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.OPERATIONS_AND_FINANCE}>
            <VendorContractPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/practice/pipeline"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <PipelineBoardPage />
          </ModuleRoute>
        }
      />

      <Route
        path="/practice/all-practices"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <AllPracticePage />
          </ModuleRoute>
        }
      />

      <Route
        path="/practice/:id/profile"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <UUIDProtectedRoute>
              <PracticeProfilePage />
            </UUIDProtectedRoute>
          </ModuleRoute>
        }
      />

      <Route
        path="/practice/active-practice"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <ActivePracticesPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/practice/prospects"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <ProspectsPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/lead/create"
        element={
          <ModuleRoute allowedRoles={BUSINESS_WRITE_ROLES}>
            <CreateLeadPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/credentialing/dashboard"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <CredentialingDashboardPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/credentialing/list"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <CredentialingListPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/practice/reminder-dues"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <ReminderDuePage />
          </ModuleRoute>
        }
      />
      <Route
        path="/deal/all-deals"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <DealsPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/people/all-peoples"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <PersonsPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/company/all-companies"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <AllCompaniesPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/communication/all-emails"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <CommunicationPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/monthly-reporting/dashboard"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <MonthlyReportingDashboard />
          </ModuleRoute>
        }
      />
      <Route
        path="/pricing-engine/rate-finalization"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.CRM}>
            <PricingEnginePage />
          </ModuleRoute>
        }
      />
      <Route
        path="/monthly-reporting/submit"
        element={
          <ModuleRoute allowedRoles={BUSINESS_WRITE_ROLES}>
            <SubmitMonthlyReport />
          </ModuleRoute>
        }
      />
      <Route
        path="/settings/general"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.SETTINGS}>
            <SettingsPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/settings/integrations"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.SETTINGS}>
            <SettingsPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/settings/team"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.SETTINGS}>
            <SettingsPage />
          </ModuleRoute>
        }
      />
      <Route
        path="/settings/security"
        element={
          <ModuleRoute allowedRoles={MODULE_ACCESS.SETTINGS}>
            <SettingsPage />
          </ModuleRoute>
        }
      />
    </Routes>
  );
}

export default App;
