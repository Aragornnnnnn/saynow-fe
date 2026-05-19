// 대화 중 나가기 버튼 클릭 시 표시되는 확인 모달
'use client';

interface ExitConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ExitConfirmModal({ onConfirm, onCancel }: ExitConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onCancel}
    >
      <div
        className="mx-6 w-full max-w-sm rounded-2xl bg-card px-6 py-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-foreground mb-2">대화를 종료할까요?</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          지금 나가면 진행 중인 대화가 저장되지 않아요.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground active:bg-muted transition-colors"
          >
            나가기
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white active:opacity-80 transition-opacity"
          >
            계속하기
          </button>
        </div>
      </div>
    </div>
  );
}
