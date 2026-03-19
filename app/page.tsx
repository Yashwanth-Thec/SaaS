import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LandingPage from "@/app/_components/LandingPage";

export default async function RootPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <LandingPage />;
}
