// Shown for an unknown project or scene under /p/<slug>.
import Link from "next/link";
import { ViewerMessage } from "@/modules/viewer";

export default function ProjectNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <ViewerMessage title="Page not found · الصفحة غير موجودة" details={["This project or view does not exist.", "هذا المشروع أو هذه الصفحة غير موجودة."]} />
      <Link href="/" className="underline underline-offset-2">
        Home · الرئيسية
      </Link>
    </div>
  );
}
