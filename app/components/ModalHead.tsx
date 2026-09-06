import { X } from "lucide-react";
export default function ModalHead({
  title,
  sub,
  close,
  icon,
}: {
  title: string;
  sub: string;
  close: () => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="modal-head">
      <div>
        <span className="modal-icon">
          {icon}
        </span>

        <div>
          <h2>
            {title}
          </h2>

          <p>
            {sub}
          </p>
        </div>
      </div>

      <button
        aria-label="Fechar janela"
        onClick={
          close
        }
        type="button"
      >
        <X />
      </button>
    </div>
  );
}
