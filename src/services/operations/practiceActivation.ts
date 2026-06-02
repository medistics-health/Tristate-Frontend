import type { PracticeBody } from "../../components/practices/types";
import {
  createDocusealSubmissionApi,
  getAgreementDocusealId,
  getAgreementsByPractice,
  sendAgreementEmailApi,
} from "./agreements";
import { getPractice, updatePracticeApi } from "./practices";

type PracticePersonLike = {
  id?: string;
  email?: string | null;
  role?: string | null;
  person?: {
    id?: string;
    email?: string | null;
    role?: string | null;
  };
};

function getEligiblePerson(persons: PracticePersonLike[] = []) {
  return persons
    .map((entry) => entry.person ?? entry)
    .find(
      (person) =>
        (person.role === "ADMIN" || person.role === "OWNER") && !!person.email,
    );
}

export async function validatePracticeActivation(practiceId: string) {
  const fullPractice = await getPractice(practiceId);
  const eligiblePerson = getEligiblePerson(
    (fullPractice.persons as PracticePersonLike[] | undefined) ?? [],
  );

  if (!eligiblePerson?.id) {
    throw new Error(
      "Practice must have at least one ADMIN/OWNER person with email to set status to ACTIVE",
    );
  }

  const agreementResponse = await getAgreementsByPractice(practiceId);
  const agreements = agreementResponse.filter(
    (init: any) => init.practiceId === practiceId && init.status !== "SIGNED",
  );
  if (agreements.length === 0) {
    throw new Error("This practice has no agreement, please create agreement");
  }

  return {
    agreement: agreements[0],
    eligiblePerson,
  };
}

export async function activatePracticeWithAgreementEmail(
  practiceId: string,
  practiceData: Partial<PracticeBody> = { status: "ACTIVE" },
): Promise<void> {
  const { agreement, eligiblePerson } =
    await validatePracticeActivation(practiceId);
  const docusealIds = getAgreementDocusealId(agreement);

  if (docusealIds?.length) {
    await createDocusealSubmissionApi({
      agreementId: agreement.id,
      personId: eligiblePerson.id,
      templateId: docusealIds,
    });
  }

  await sendAgreementEmailApi({
    agreementId: agreement.id,
    personId: eligiblePerson.id,
  });

  await updatePracticeApi(practiceId, {
    ...practiceData,
    status: "ACTIVE",
  });
}
