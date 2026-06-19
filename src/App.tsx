import { Navigate, Route, Routes, useParams } from "react-router-dom";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import AdminRoute from "./components/auth/AdminRoute";
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
import AllLineItems from "./components/invoice-line-items/AllLineItems";
import AllServices from "./components/services/AllServices";
import ServiceCatalogPage from "./components/services/ServiceCatalog";
import ActiveServicePage from "./components/services/ActiveServices";
import AllChannelPartnersPage from "./components/channel-partners/AllChannelPartners";
import AllPartnersPage from "./components/channel-partners/AllPartners";
import AssessmentProgressPage from "./components/assessments/AssessmentProgress";
import InvoiceStatusBoardPage from "./components/invoices/InvoiceStatusBoard";
import AllInvoicePage from "./components/invoices/AllInvoices";
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
import type { ReactNode } from "react";
import OnboardingFormV4 from "./components/onboarding/OnboardingFormV4";
import {
  BUSINESS_WRITE_ROLES,
  INTEGRATIONS_ROLES,
  OPERATIONS_AND_FINANCE_WRITE_ROLES,
  SETTINGS_ROLES,
} from "./utils/auth";

function App() {
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
            <OnboardingFormV4 />
          </UUIDProtectedRoute>
        }
      />

      <Route
        path="/onboarding/review"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <AdminOnboardingReview />
            </RoleRoute>
          </ProtectedRoute>
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
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <AllPracticeAuditsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/audit/all-audits"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <Audits />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/audit/status-board"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <AuditStatusBoard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchase-orders/all"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...OPERATIONS_AND_FINANCE_WRITE_ROLES]}>
              <AllPurchaseOrdersPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchase-orders/status-board"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...OPERATIONS_AND_FINANCE_WRITE_ROLES]}>
              <PurchaseOrderStatusBoardPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchase-orders/pending-approval"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...OPERATIONS_AND_FINANCE_WRITE_ROLES]}>
              <PendingApprovalPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchase-orders/unpaid-pos"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...OPERATIONS_AND_FINANCE_WRITE_ROLES]}>
              <PurchaseOrdersPage />
            </RoleRoute>
          </ProtectedRoute>
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
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...INTEGRATIONS_ROLES]}>
              <AccountingSyncDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/integrations/mercury-banking"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...INTEGRATIONS_ROLES]}>
              <MercuryBankingDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendors/payables"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...OPERATIONS_AND_FINANCE_WRITE_ROLES]}>
              <VendorPayableDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendors/payables/pay/:id"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...OPERATIONS_AND_FINANCE_WRITE_ROLES]}>
              <PayVendorPayable />
            </RoleRoute>
          </ProtectedRoute>
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
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <AllAgreementsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/agreements/pipeline"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <AgreementPipelinePage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/agreements/pending-approval"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AgreementPendingApprovalPage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/invoice/overdue"
        element={
          <ProtectedRoute>
            <OverdueInvoicePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/agreements/pending-signatures"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <AgreementPendingSignaturesPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/agreements/pending-submission-changes"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AgreementPendingSubmissionChangesPage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/invoice/all-invoice-line-items"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...OPERATIONS_AND_FINANCE_WRITE_ROLES]}>
              <AllInvoiceLineItems />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoice/all-line-items"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...OPERATIONS_AND_FINANCE_WRITE_ROLES]}>
              <AllLineItems />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/service/all-services"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <AllServices />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/service/service-catalogs"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <ServiceCatalogPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/service/active-services"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <ActiveServicePage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/partner/all-channel-partners"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <AllChannelPartnersPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/partner/all-partners"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <AllPartnersPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/assessment/all-assessments"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <AssessmentsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/assessment/progress"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <AssessmentProgressPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/invoice/all-invoices"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...OPERATIONS_AND_FINANCE_WRITE_ROLES]}>
              <AllInvoicePage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/invoice/status-board"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...OPERATIONS_AND_FINANCE_WRITE_ROLES]}>
              <InvoiceStatusBoardPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing/runs"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...OPERATIONS_AND_FINANCE_WRITE_ROLES]}>
              <BillingRunsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/status-board"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...OPERATIONS_AND_FINANCE_WRITE_ROLES]}>
              <BillingStatusBoardPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendors/all-vendors"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...OPERATIONS_AND_FINANCE_WRITE_ROLES]}>
              <AllVendorsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendors/contracts"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...OPERATIONS_AND_FINANCE_WRITE_ROLES]}>
              <VendorContractPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/practice/pipeline"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <PipelineBoardPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/practice/all-practices"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <AllPracticePage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/practice/:id/profile"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <UUIDProtectedRoute>
                <PracticeProfilePage />
              </UUIDProtectedRoute>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/practice/active-practice"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <ActivePracticesPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/practice/prospects"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <ProspectsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lead/create"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <CreateLeadPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/practice/reminder-dues"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <ReminderDuePage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/deal/all-deals"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <DealsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/person/all-persons"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <PersonsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/all-companies"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <AllCompaniesPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/monthly-reporting/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <MonthlyReportingDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pricing-engine/rate-finalization"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <PricingEnginePage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/monthly-reporting/submit"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...BUSINESS_WRITE_ROLES]}>
              <SubmitMonthlyReport />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/general"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...SETTINGS_ROLES]}>
              <SettingsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/integrations"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...SETTINGS_ROLES]}>
              <SettingsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/team"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...SETTINGS_ROLES]}>
              <SettingsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/security"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[...SETTINGS_ROLES]}>
              <SettingsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
