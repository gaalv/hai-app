import { useAuthStore } from "../../stores/auth.store";
import { HaiIcon } from "../ui/HaiIcon";

interface RailProps {
  onAvatarClick: () => void;
}

export function Rail({ onAvatarClick }: RailProps): JSX.Element {
  const { profile } = useAuthStore();
  const avatarInitial = (profile?.name || profile?.login || "U")[0].toUpperCase();

  return (
    <nav className="flex flex-col items-center shrink-0 w-[52px] bg-[var(--app-rail)] border-r-[0.5px] border-r-[var(--app-border)] py-[14px] px-0 titlebar-no-drag">
      {/* Logo */}
      <div className="mb-[18px]">
        <HaiIcon size={28} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Avatar */}
      <div
        className="flex items-center justify-center text-[10px] font-medium text-white cursor-pointer w-[26px] h-[26px] rounded-full bg-gradient-to-br from-[#C05010] to-[#E88A50] border-[1.5px] border-[rgba(192,80,16,0.4)]"
        onClick={onAvatarClick}
        title={`${profile?.login || "Usuário"} · Clique para abrir menu`}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.login}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          avatarInitial
        )}
      </div>
    </nav>
  );
}
