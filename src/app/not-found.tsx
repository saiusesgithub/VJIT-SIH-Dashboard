import Link from "next/link";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-stone-50 p-6"><div className="text-center"><p className="font-mono text-xs font-semibold text-blue-700">404</p><h1 className="mt-2 text-xl font-semibold text-zinc-950">Record not found</h1><p className="mt-2 text-sm text-zinc-500">The requested venue or team does not exist.</p><Link href="/admin" className="mt-5 inline-flex rounded-lg bg-zinc-950 px-3.5 py-2 text-xs font-medium text-white hover:bg-zinc-800">Return to overview</Link></div></main>;
}
