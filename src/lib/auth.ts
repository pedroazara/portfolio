import type { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * Erro cuja mensagem já está pronta para ser exibida ao usuário.
 * `describeAuthError` devolve essa mensagem intacta em vez de traduzi-la.
 */
class UserFacingError extends Error {
  readonly userFacing = true;
}

function userError(message: string): UserFacingError {
  return new UserFacingError(message);
}

/**
 * Traduz os erros do Supabase Auth para mensagens legíveis em português.
 * Erros de credencial recebem uma mensagem genérica de propósito, para não
 * revelar se um e-mail está ou não cadastrado.
 */
export function describeAuthError(error: unknown): string {
  if (error instanceof UserFacingError) {
    return error.message;
  }

  const err = error as { message?: string; status?: number; code?: string } | null;
  const message = (err?.message || "").toLowerCase();
  const code = err?.code || "";

  if (!isSupabaseConfigured) {
    return "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.";
  }
  if (message.includes("invalid login credentials") || code === "invalid_credentials") {
    return "E-mail ou senha incorretos.";
  }
  if (message.includes("email not confirmed") || code === "email_not_confirmed") {
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  }
  if (message.includes("user not found")) {
    return "E-mail ou senha incorretos.";
  }
  if (message.includes("rate limit") || message.includes("for security purposes") || err?.status === 429) {
    return "Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.";
  }
  if (message.includes("should be at least") || message.includes("password") && message.includes("weak")) {
    return "A nova senha é muito fraca. Use pelo menos 6 caracteres.";
  }
  if (message.includes("same as the old password") || message.includes("should be different")) {
    return "A nova senha precisa ser diferente da atual.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }
  if (message.includes("signups not allowed") || message.includes("not enabled")) {
    return "Login por e-mail/senha não está habilitado neste projeto Supabase.";
  }

  return "Não foi possível concluir a operação. Tente novamente.";
}

/** Lança o erro do Supabase quando a resposta traz `error` preenchido. */
function raiseIfError(error: unknown): void {
  if (error) throw error;
}

/**
 * Observa o estado de autenticação. Retorna a função de cancelamento.
 * O Supabase dispara um evento `INITIAL_SESSION` logo na inscrição, então o
 * callback sempre recebe o estado atual — inclusive `null` quando ninguém está
 * autenticado.
 */
export function observeAuth(callback: (user: User | null) => void): () => void {
  if (!isSupabaseConfigured) {
    // Sem credenciais não há sessão possível; avisa o estado deslogado uma vez
    // para que a interface saia do estado "verificando".
    callback(null);
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return () => data.subscription.unsubscribe();
}

/** Usuário autenticado no momento, ou null. */
export async function currentUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/** Autentica o administrador com e-mail e senha. */
export async function login(email: string, password: string): Promise<User> {
  if (!isSupabaseConfigured) {
    throw userError("Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  raiseIfError(error);

  if (!data.user) {
    throw userError("Sessão não retornada pelo servidor.");
  }
  return data.user;
}

/** Encerra a sessão do administrador. */
export async function logout(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  raiseIfError(error);
}

/** Envia o e-mail de redefinição de senha. */
export async function requestPasswordReset(email: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw userError("Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/admin`,
  });
  raiseIfError(error);
}

/**
 * Altera a senha do administrador.
 *
 * `updateUser` do Supabase não pede a senha atual — bastaria a sessão ativa.
 * Confirmamos a senha atual com um `signInWithPassword` antes de trocar, para
 * que uma sessão esquecida aberta em outro computador não permita a troca.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw userError("Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  }

  const { data: sessionData } = await supabase.auth.getUser();
  const email = sessionData.user?.email;
  if (!email) {
    throw userError("Nenhuma sessão ativa. Entre novamente para trocar a senha.");
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (reauthError) {
    throw userError("A senha atual digitada está incorreta.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  raiseIfError(error);
}
