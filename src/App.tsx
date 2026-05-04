import { Navigate, Route, Routes, useParams } from "react-router-dom";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import AllAgreementsPage from "./components/agreements/all-agreements/AllAgreements";
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
import VendorContractPage from "./components/vendors/VendorContracts";
import AllVendorsPage from "./components/vendors/AllVendors";
import PipelineBoardPage from "./components/practices/PipelineBoard";
import AllPracticePage from "./components/practices/AllPractice";
import ActivePracticesPage from "./components/practices/ActivePractices";
import ProspectsPage from "./components/practices/Prospects";
import ReminderDuePage from "./components/practices/RemindersDue";
import OverdueInvoicePage from "./components/invoices/OverdueInvoices";
import BillingRunsPage from "./components/billing/BillingRuns";
import BillingStatusBoardPage from "./components/billing/BillingStatusBoard";
import DealsPage from "./components/deal/Deals";
import PersonsPage from "./components/contact/Persons";
import AllCompaniesPage from "./components/companies/AllCompanies";
import AgreementPipelinePage from "./components/agreements/agreements-pipeline/AgreementPipeline";
import DocumentSigningPage from "./components/shared/DocumentSigningPage";
import OnboardingForm from "./components/onboarding/OnboardingFormV2";
import OnboardingFormV2 from "./components/onboarding/OnboardingFormV2";

function App() {
  function UUIDProtectedRoute({ children }) {
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

  function SignPage({ children }) {
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
            <OnboardingFormV2 />
          </UUIDProtectedRoute>
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
            <AllPracticeAuditsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/audit/all-audits"
        element={
          <ProtectedRoute>
            <Audits />
          </ProtectedRoute>
        }
      />

      <Route
        path="/audit/status-board"
        element={
          <ProtectedRoute>
            <AuditStatusBoard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchase-orders/all"
        element={
          <ProtectedRoute>
            <AllPurchaseOrdersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchase-orders/status-board"
        element={
          <ProtectedRoute>
            <PurchaseOrderStatusBoardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchase-orders/pending-approval"
        element={
          <ProtectedRoute>
            <PendingApprovalPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchase-orders/unpaid-pos"
        element={
          <ProtectedRoute>
            <PurchaseOrdersPage />
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
            <AllAgreementsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/agreements/pipeline"
        element={
          <ProtectedRoute>
            <AgreementPipelinePage />
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
            <AgreementPendingSignaturesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/invoice/all-invoice-line-items"
        element={
          <ProtectedRoute>
            <AllInvoiceLineItems />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoice/all-line-items"
        element={
          <ProtectedRoute>
            <AllLineItems />
          </ProtectedRoute>
        }
      />

      <Route
        path="/service/all-services"
        element={
          <ProtectedRoute>
            <AllServices />
          </ProtectedRoute>
        }
      />

      <Route
        path="/service/service-catalogs"
        element={
          <ProtectedRoute>
            <ServiceCatalogPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/service/active-services"
        element={
          <ProtectedRoute>
            <ActiveServicePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/partner/all-channel-partners"
        element={
          <ProtectedRoute>
            <AllChannelPartnersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/partner/all-partners"
        element={
          <ProtectedRoute>
            <AllPartnersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assessment/all-assessments"
        element={
          <ProtectedRoute>
            <AssessmentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assessment/progress"
        element={
          <ProtectedRoute>
            <AssessmentProgressPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/invoice/all-invoices"
        element={
          <ProtectedRoute>
            <AllInvoicePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/invoice/status-board"
        element={
          <ProtectedRoute>
            <InvoiceStatusBoardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing/runs"
        element={
          <ProtectedRoute>
            <BillingRunsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/status-board"
        element={
          <ProtectedRoute>
            <BillingStatusBoardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendors/all-vendors"
        element={
          <ProtectedRoute>
            <AllVendorsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendors/contracts"
        element={
          <ProtectedRoute>
            <VendorContractPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/practice/pipeline"
        element={
          <ProtectedRoute>
            <PipelineBoardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/practice/all-practices"
        element={
          <ProtectedRoute>
            <AllPracticePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/practice/active-practice"
        element={
          <ProtectedRoute>
            <ActivePracticesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/practice/prospects"
        element={
          <ProtectedRoute>
            <ProspectsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/practice/reminder-dues"
        element={
          <ProtectedRoute>
            <ReminderDuePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/deal/all-deals"
        element={
          <ProtectedRoute>
            <DealsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/person/all-persons"
        element={
          <ProtectedRoute>
            <PersonsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/all-companies"
        element={
          <ProtectedRoute>
            <AllCompaniesPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
