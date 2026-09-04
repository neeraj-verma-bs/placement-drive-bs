import { Suspense } from "react";
import LoginForm from "./login-form";

export const metadata = { title: "Sign in · Placement Drive" };

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-lg font-semibold tracking-tight">Placement Drive</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Subjective round evaluation sheet.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
