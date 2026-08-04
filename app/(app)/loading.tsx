import { Spinner } from "@/components/ui/Spinner";

export default function AppLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-24 sm:px-6">
      <Spinner label="Loading…" />
    </main>
  );
}
