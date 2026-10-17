"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteHabitDialogProps {
  /** Thói quen cần xác nhận xóa; null = đóng hộp thoại */
  habit: { id: string; title: string } | null;
  onCancel: () => void;
  onConfirm: (id: string) => void;
  /** Gợi ý dùng "Lưu trữ" thay vì xóa (ẩn khi thói quen đã được lưu trữ) */
  suggestArchive?: boolean;
}

export function DeleteHabitDialog({ habit, onCancel, onConfirm, suggestArchive = true }: DeleteHabitDialogProps) {
  return (
    <Dialog open={habit !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa thói quen?</DialogTitle>
          <DialogDescription>
            Thói quen &ldquo;{habit?.title}&rdquo; cùng toàn bộ lịch sử check-in sẽ bị xóa vĩnh viễn.
            {suggestArchive && <> Nếu chỉ muốn tạm ẩn, hãy chọn &ldquo;Lưu trữ&rdquo;.</>}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button variant="destructive" onClick={() => habit && onConfirm(habit.id)}>
            Xóa vĩnh viễn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
