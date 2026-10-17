import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Compass className="size-7" />
      </div>
      <div>
        <p className="text-sm font-semibold text-muted-foreground">404</p>
        <h1 className="text-xl font-semibold">Không tìm thấy trang</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Trang bạn tìm không tồn tại hoặc đã được di chuyển.
        </p>
      </div>
      <Link href="/" className={buttonVariants()}>
        Về trang hôm nay
      </Link>
    </main>
  );
}
