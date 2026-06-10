import { LegalDocumentPage } from '@/components/LegalDocumentPage';
import { privacyDocument } from '@/lib/legalDocuments';

export default function PublicPrivacyPage() {
  return (
    <LegalDocumentPage
      document={privacyDocument}
      backHref="/"
      backLabel="Landit 홈으로 돌아가기"
    />
  );
}
