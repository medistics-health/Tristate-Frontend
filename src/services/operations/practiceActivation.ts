import type { PracticeBody } from "../../components/practices/types";
import {
  createDocusealSubmissionApi,
  getAgreementDocusealId,
  getAgreementsByPractice,
  sendAgreementEmailApi,
  type Agreement,
} from "./agreements";
import { getPractice, updatePracticeApi } from "./practices";

type PracticePersonLike = {
  id?: string;
  email?: string | null;
  roles?: string[] | null;
  person?: {
    id?: string;
    email?: string | null;
    roles?: string[] | null;
  };
};

function getEligiblePerson(persons: PracticePersonLike[] = []) {
  return persons
    .map((entry) => entry.person ?? entry)
    .find(
      (person) =>
        (person.roles?.includes("ADMIN") || person.roles?.includes("OWNER")) &&
        !!person.email,
    );
}

export async function validatePracticeAgreementSend(practiceId: string) {
  const fullPractice = await getPractice(practiceId);
  const eligiblePerson = getEligiblePerson(
    (fullPractice.persons as PracticePersonLike[] | undefined) ?? [],
  );

  if (!eligiblePerson?.id) {
    throw new Error(
      "Practice must have at least one ADMIN/OWNER person with email to set status to Agreement Sent",
    );
  }

  const agreementResponse = await getAgreementsByPractice(practiceId);
  const agreements = agreementResponse.filter(
    (init: Agreement) =>
      init.practiceId === practiceId &&
      !["SIGNED", "ACTIVE", "INACTIVE", "EXPIRED", "TERMINATED"].includes(
        init.status,
      ),
  );
  if (agreements.length === 0) {
    throw new Error("This practice has no agreement, please create agreement");
  }

  return {
    agreements,
    eligiblePerson,
    practice: fullPractice,
  };
}

export async function activatePracticeWithAgreementEmail(
  practiceId: string,
  practiceData: Partial<PracticeBody> = { status: "AGREEMENT_SENT" },
): Promise<void> {
  const { agreements, eligiblePerson } =
    await validatePracticeAgreementSend(practiceId);

  const needsApproval = agreements.some((agreement) =>
    agreement.docusealSubmissions?.some(
      (submission) => submission.approval_status === "PENDING_APPROVAL",
    ),
  );

  if (needsApproval) {
    throw new Error("This practice agreement needs admin approval");
  }

  for (const agreement of agreements) {
    const docusealIds = getAgreementDocusealId(agreement);
    const fieldValuesByTemplateId = (agreement.docusealSubmissions || []).reduce<
      Record<string, Record<string, string>>
    >((acc, submission) => {
      if (submission.templateId) {
        acc[String(submission.templateId)] = submission.fieldValues || {};
      }
      return acc;
    }, {});

    if (docusealIds?.length) {
      await createDocusealSubmissionApi({
        agreementId: agreement.id,
        personId: eligiblePerson.id,
        templateId: docusealIds,
        fieldValuesByTemplateId,
      });
    }

    await sendAgreementEmailApi({
      agreementId: agreement.id,
      personId: eligiblePerson.id,
    });
  }

  await updatePracticeApi(practiceId, {
    ...practiceData,
    status: "AGREEMENT_SENT",
  });
}
