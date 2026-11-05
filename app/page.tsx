import { redirect } from "next/navigation";
import { DEMO_HOME } from "@/demo/config";

export default function Home() {
  redirect(DEMO_HOME);
}
