"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signIn } from "@/auth";

function safeCallbackUrl(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/app";
  if (!value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}

function redirectToSignIn(error: string, callbackUrl: string): never {
  const params = new URLSearchParams({ error, callbackUrl });
  redirect(`/auth/sign-in?${params.toString()}`);
}

export async function signInWithResend(formData: FormData) {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));
  const email = formData.get("email");

  if (!process.env.RESEND_API_KEY) {
    redirectToSignIn("Configuration", callbackUrl);
  }
  if (typeof email !== "string" || !email.includes("@")) {
    redirectToSignIn("EmailSignin", callbackUrl);
  }

  try {
    await signIn("resend", { email, redirectTo: callbackUrl });
  } catch (err) {
    if (isRedirectError(err)) throw err;
    if (err instanceof AuthError) {
      redirectToSignIn(err.type || "EmailSignin", callbackUrl);
    }
    redirectToSignIn("EmailSignin", callbackUrl);
  }
}

export async function signInWithGithub(formData: FormData) {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));

  try {
    await signIn("github", { redirectTo: callbackUrl });
  } catch (err) {
    if (isRedirectError(err)) throw err;
    if (err instanceof AuthError) {
      redirectToSignIn(err.type || "OAuthSignin", callbackUrl);
    }
    redirectToSignIn("OAuthSignin", callbackUrl);
  }
}
