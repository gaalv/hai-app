import { useEffect } from "react";
import { vaultService } from "../../services/vault";
import { appService } from "../../services/app";
import { authService } from "../../services/auth";
import { useVaultStore } from "../../stores/vault.store";
import { useAuthStore } from "../../stores/auth.store";
import { useModeStore } from "../../stores/mode.store";
import { OnboardingScreen } from "../vault/OnboardingScreen";
import { OnboardingModeStep } from "../onboarding/OnboardingModeStep";
import { LoginScreen } from "../auth/LoginScreen";
import { MainLayout } from "./MainLayout";

export function AppShell(): JSX.Element {
  const { config, isLoading: isVaultLoading, error } = useVaultStore();
  const { profile, isLoading: isAuthLoading } = useAuthStore();
  const { mode, isLoaded: isModeLoaded } = useModeStore();

  useEffect(() => {
    async function init() {
      const resolvedMode = await appService.getMode();
      if (resolvedMode === 'sync') {
        await authService.checkAuth();
      } else {
        useAuthStore.getState().setLoading(false);
      }
      await vaultService.load();
    }
    init();
  }, []);

  const isLoading = !isModeLoaded || isVaultLoading || (mode === 'sync' && isAuthLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] text-[var(--text-3)] text-sm">
        Carregando...
      </div>
    );
  }

  if (mode === null) {
    return (
      <OnboardingModeStep
        onComplete={async (selectedMode) => {
          await appService.setMode(selectedMode);
        }}
      />
    );
  }

  if (mode === 'sync' && !profile) {
    return <LoginScreen />;
  }

  if (error && !config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] gap-4">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => {
            useVaultStore.getState().clearVault();
            useVaultStore.getState().setError(null);
          }}
          className="px-4 py-2.5 bg-[var(--accent)] hover:opacity-90 text-white rounded-lg text-sm transition-opacity cursor-pointer"
        >
          Reconfigurar vault
        </button>
      </div>
    );
  }

  if (!config) return <OnboardingScreen />;

  return <MainLayout />;
}
