import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <h1 className="text-lg font-semibold text-ink">This page doesn't exist</h1>
      <p className="mt-1 text-sm text-muted">Check the address, or head back to your meetings.</p>
      <Link href="/meetings" className="btn-primary mt-5">Go to meetings</Link>
    </div>
  );
}
