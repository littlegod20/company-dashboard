import { redirect } from "next/navigation";

// Root "/" redirects to the upload page as the primary entry point
export default function Home() {
  redirect("/upload");
}
