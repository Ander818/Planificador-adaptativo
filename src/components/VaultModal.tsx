import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Key, 
  Download, 
  Upload,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import { CryptoService } from '../services/crypto';
import { StorageService } from '../services/storage';
import { AdvisorService } from '../services/advisor';

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultLocked: boolean;
  onVaultStateChange: (unlocked: boolean) => void;
}

export const VaultModal: React.FC<VaultModalProps> = ({
  isOpen,
  onClose,
  vaultLocked,
  onVaultStateChange,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUnlockOrSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) return;

    setErrorMessage(null);
    const success = await CryptoService.unlockVault(passphrase);
    if (success) {
      onVaultStateChange(true);
      setSuccessMessage('Bóveda E2EE desbloqueada correctamente. Datos cifrados en memoria.');
      setPassphrase('');
      AdvisorService.playChime('focus_complete');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage('Clave incorrecta o formato de bóveda inválido.');
      AdvisorService.playChime('alert');
    }
  };

  const handleLockVault = () => {
    CryptoService.lockVault();
    onVaultStateChange(false);
    setSuccessMessage('Bóveda bloqueada. Los datos permanecen protegidos con AES-GCM.');
    AdvisorService.playChime('notification');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExportEncryptedBackup = () => {
    const raw = StorageService.exportFullDataBackup();
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'khoros_e2ee_vault_backup.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    AdvisorService.playChime('notification');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = StorageService.importFullDataBackup(content);
        if (ok) {
          AdvisorService.playChime('focus_complete');
          alert('Copia de seguridad restaurada con éxito. La página se actualizará.');
          window.location.reload();
        } else {
          alert('Error al leer el archivo de copia de seguridad.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {vaultLocked ? (
              <ShieldAlert className="w-5 h-5 text-amber-500" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            )}
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Seguridad & Cifrado de Extremo a Extremo
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Architecture Spec */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Estándar Criptográfico:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">AES-GCM (256 bits)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Derivación de Clave:</span>
              <span className="font-mono">PBKDF2 (100,000 iteraciones SHA-256)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Privacidad:</span>
              <span>Zero-Knowledge (Solo tú tienes la llave)</span>
            </div>
          </div>

          {/* Form to unlock or set passphrase */}
          <form onSubmit={handleUnlockOrSetup} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {vaultLocked ? 'Ingrese su Frase Maestra para Desbloquear' : 'Bóveda Desbloqueada'}
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Introduce tu frase de paso segura..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              {vaultLocked ? (
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Desbloquear</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLockVault}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Bloquear</span>
                </button>
              )}
            </div>
          </form>

          {errorMessage && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{errorMessage}</p>
          )}

          {successMessage && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">{successMessage}</p>
          )}

          {/* Backup & Restore */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Copias de Seguridad Cifradas
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportEncryptedBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Bóveda (.json)</span>
              </button>

              <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Restaurar Bóveda</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
