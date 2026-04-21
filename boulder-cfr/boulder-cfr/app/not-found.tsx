import Link from "next/link";
import { BoulderMark } from "@/components/boulder-logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <BoulderMark size="sm" className="items-center" />
        <h1 className="mt-6 font-display text-5xl font-bold text-neutral-950">404</h1>
        <p className="mt-2 text-sm text-neutral-500">That page doesn&rsquo;t exist.</p>
        <Button asChild className="mt-5">
          <Link href="/projects">Back to projects</Link>
        </Button>
      </div>
    </div>
  );
}
