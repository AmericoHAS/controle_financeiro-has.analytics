"use client";

import {
  ChevronDown,
  ExternalLink,
  LifeBuoy,
  LogOut,
  Mail,
  UserRound,
} from "lucide-react";

export default function ProfileMenu({
  name,
  email,
  onProfile,
  onLogout,
}: {
  name: string;
  email: string;
  onProfile: () => void;
  onLogout: () => void;
}) {
  function closeMenu(
    event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>
  ) {
    event.currentTarget
      .closest("details")
      ?.removeAttribute("open");
  }

  return (
    <details className="profile-menu">
      <summary
        className="profile"
        aria-label="Abrir menu da conta"
      >
        <div className="profile-avatar">
          {name.slice(0, 2).toUpperCase()}
        </div>

        <span className="profile-info">
          <b>{name}</b>
          <small>Minha conta</small>
        </span>

        <ChevronDown className="profile-chevron" />
      </summary>

      <div className="profile-popover">
        <div className="profile-popover-head">
          <strong>{name}</strong>
          <small>{email}</small>
        </div>

        <button
          type="button"
          onClick={(event) => {
            closeMenu(event);
            onProfile();
          }}
        >
          <UserRound />
          Meu perfil
        </button>

        <a
          href="mailto:antunnyamerico@gmail.com?subject=Suporte%20HAS%20Financial"
          onClick={closeMenu}
        >
          <LifeBuoy />
          Suporte da plataforma
        </a>

        <a
          href="mailto:antunnyamerico@gmail.com?subject=Problema%20com%20senha%20-%20HAS%20Financial"
          onClick={closeMenu}
        >
          <Mail />
          Problemas com a senha
        </a>

        <a
          href="https://hasanalytics.com.br"
          target="_blank"
          rel="noreferrer"
          onClick={closeMenu}
        >
          <ExternalLink />
          HAS Analytics
        </a>

        <div className="profile-popover-divider" />

        <button
          type="button"
          className="profile-logout"
          onClick={onLogout}
        >
          <LogOut />
          Sair da conta
        </button>
      </div>
    </details>
  );
}