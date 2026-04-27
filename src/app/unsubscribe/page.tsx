import { getAdminSupabase } from "@/lib/supabase/server";
import PageChrome from "@/components/PageChrome";
import ContentContainer from "@/components/ContentContainer";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const sp = await searchParams;
  const token = (sp.token ?? "").trim();
  let status: "missing" | "ok" | "notfound" | "error" = "missing";
  let email = "";

  if (token.length > 0 && token.length < 200) {
    try {
      const admin = getAdminSupabase();
      const { data, error } = await admin
        .from("email_subscriptions")
        .update({ paused: true })
        .eq("unsub_token", token)
        .select("email")
        .maybeSingle();
      if (error) status = "error";
      else if (!data) status = "notfound";
      else {
        status = "ok";
        email = (data as { email: string }).email;
      }
    } catch {
      status = "error";
    }
  }

  return (
    <PageChrome hideNav>
    <ContentContainer width="narrow" className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      {status === "ok" && (
        <>
          <div><svg className="mx-auto h-12 w-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg></div>
          <h1 className="mt-4 text-2xl font-extrabold text-white">You&apos;re unsubscribed</h1>
          <p className="mt-2 text-white/65">
            We won&apos;t send weekly digests to <strong>{email}</strong> anymore.
          </p>
          <p className="mt-1 text-sm text-white/50">
            You can re-subscribe anytime from{" "}
            <a href="/journey" className="text-indigo-300 underline">your journey page</a>.
          </p>
        </>
      )}
      {status === "missing" && (
        <>
          <div><svg className="mx-auto h-12 w-12 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg></div>
          <h1 className="mt-4 text-2xl font-extrabold text-white">Missing token</h1>
          <p className="mt-2 text-white/65">Use the unsubscribe link from your email.</p>
        </>
      )}
      {status === "notfound" && (
        <>
          <div><svg className="mx-auto h-12 w-12 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0 0 12.016 15a4.486 4.486 0 0 0-3.198 1.318M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg></div>
          <h1 className="mt-4 text-2xl font-extrabold text-white">Already gone</h1>
          <p className="mt-2 text-white/65">
            We couldn&apos;t find a subscription with that token. You may have already unsubscribed.
          </p>
        </>
      )}
      {status === "error" && (
        <>
          <div><svg className="mx-auto h-12 w-12 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg></div>
          <h1 className="mt-4 text-2xl font-extrabold text-white">Something went wrong</h1>
          <p className="mt-2 text-white/65">Please try the link again, or reply to the email and we&apos;ll remove you manually.</p>
        </>
      )}
      <a
        href="/"
        className="mt-6 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-800"
      >
        Back to CareerCompass
      </a>
    </ContentContainer>
    </PageChrome>
  );
}
