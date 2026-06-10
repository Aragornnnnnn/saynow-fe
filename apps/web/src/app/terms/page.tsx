import { LegalDocumentPage } from '@/components/LegalDocumentPage';
import { termsDocument } from '@/lib/legalDocuments';

export default function PublicTermsPage() {
  return (
    <LegalDocumentPage
      document={termsDocument}
      backHref="/"
      backLabel="Landit 홈으로 돌아가기"
    />
  );
}
