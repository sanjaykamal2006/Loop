import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-black px-8 text-center text-white">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#FFC554]">
        404
      </p>
      <h1 className="mt-4 text-4xl font-black tracking-tighter">
        This loop does not exist.
      </h1>
      <p className="mt-3 max-w-xs text-sm font-medium text-white/60">
        The page you are looking for was moved, expired, or never started.
      </p>
      <Link
        href="/"
        className="mt-8 flex h-14 w-full max-w-xs items-center justify-center rounded-full bg-[#FFC554] text-sm font-black text-black transition-transform active:scale-[0.98]"
      >
        Back to home
      </Link>
    </main>
  );
}
