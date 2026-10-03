import type { Metadata } from "next";
import { AccountSettings } from "@/components/account/AccountSettings";

export const metadata: Metadata = { title: "Profile" };

export default function MemberProfilePage() {
  return <AccountSettings />;
}
