"use client";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
export default function ProfileMenu({ name, email, onProfile, onLogout }: { name: string; email: string; onProfile: () => void; onLogout: () => void }) {
  return <details className="profile-menu"><summary className="profile" aria-label="Abrir menu da conta"><div>{name.slice(0,2).toUpperCase()}</div><span><b>{name}</b><small>Minha conta</small></span><ChevronDown /></summary><div className="profile-popover"><strong>{name}</strong><small>{email}</small><button onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); onProfile(); }}><UserRound />Meu perfil</button><button onClick={onLogout}><LogOut />Sair da conta</button></div></details>;
}
