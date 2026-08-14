import {
  EmailAuthProvider,
  User,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import { auth } from "../firebase";

/**
 * Traduz os códigos de erro do Firebase Auth para mensagens legíveis em português.
 * Erros de credencial recebem uma mensagem genérica de propósito, para não revelar
 * se um e-mail está ou não cadastrado.
 */
export function describeAuthError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "E-mail ou senha incorretos.";
    case "auth/user-disabled":
      return "Esta conta foi desativada.";
    case "auth/too-many-requests":
      return "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.";
    case "auth/network-request-failed":
      return "Falha de conexão. Verifique sua internet e tente novamente.";
    case "auth/weak-password":
      return "A nova senha é muito fraca. Use pelo menos 6 caracteres.";
    case "auth/requires-recent-login":
      return "Por segurança, entre novamente antes de alterar a senha.";
    case "auth/operation-not-allowed":
      return "Login por e-mail/senha não está habilitado no projeto Firebase.";
    default:
      return "Não foi possível concluir a operação. Tente novamente.";
  }
}

/**
 * Observa o estado de autenticação. Retorna a função de cancelamento da inscrição.
 * O callback recebe `null` quando não há ninguém autenticado.
 */
export function observeAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/** Usuário autenticado no momento, ou null. */
export function currentUser(): User | null {
  return auth.currentUser;
}

/** Autentica o administrador com e-mail e senha. */
export async function login(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

/** Encerra a sessão do administrador. */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/** Envia o e-mail de redefinição de senha. */
export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Altera a senha do administrador. O Firebase exige uma sessão recente para essa
 * operação, então reautenticamos com a senha atual antes de atualizar.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw Object.assign(new Error("no-session"), { code: "auth/requires-recent-login" });
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
