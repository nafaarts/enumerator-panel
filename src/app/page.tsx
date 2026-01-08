import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground relative">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          Enumerator Admin Panel
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Central control system for enumerator management, form assignments, and data monitoring.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/login">
            <Button size="lg">Login to Admin</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
