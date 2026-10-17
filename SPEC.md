# ĐẶC TẢ DỰ ÁN: DAILY HABIT TRACKER

## 1. Mục tiêu sản phẩm
Ứng dụng theo dõi thói quen hàng ngày giao diện tối giản, tốc độ phản hồi tức thì (Optimistic UI), tính toán chính xác chuỗi ngày liên tiếp (Streak) và trực quan hóa dữ liệu bằng bản đồ nhiệt (Heatmap).

## 2. Cấu trúc dữ liệu cốt lõi (Database Schema)
### Bảng Habit
- id: String (CUID/UUID, Primary Key)
- title: String (Bắt buộc, tối đa 100 ký tự)
- description: String? (Tùy chọn)
- icon: String (Tên icon từ lucide-react, mặc định: "CheckCircle2")
- color: String (Mã màu Hex, mặc định: "#10b981")
- frequencyType: String ("DAILY" hoặc "SPECIFIC_DAYS")
- targetDays: String (Mảng JSON lưu các thứ trong tuần từ 0=CN đến 6=T7, ví dụ: "[1,3,5]")
- archived: Boolean (Mặc định: false)
- createdAt: DateTime (Mặc định: now())

### Bảng HabitLog
- id: String (CUID/UUID, Primary Key)
- habitId: String (Foreign Key tham chiếu tới Habit, onDelete: Cascade)
- date: String (Định dạng bắt buộc "YYYY-MM-DD" theo giờ địa phương)
- status: String ("COMPLETED" hoặc "SKIPPED")
- note: String? (Ghi chú ngắn trong ngày)
- createdAt: DateTime (Mặc định: now())
- Unique Constraint: @@unique([habitId, date])

## 3. Quy tắc nghiệp vụ tính Streak
1. Ngày chuẩn (YYYY-MM-DD): Mọi thao tác lưu và truy vấn ngày tháng phải chuyển về chuỗi YYYY-MM-DD theo múi giờ local.
2. Current Streak (Chuỗi hiện tại):
   - Đếm ngược từ ngày hôm nay về trước. Nếu hôm nay chưa COMPLETED, kiểm tra từ ngày hôm qua.
   - Với thói quen SPECIFIC_DAYS: Những ngày không nằm trong targetDays sẽ được bỏ qua, không làm đứt chuỗi.
   - Trạng thái SKIPPED (nghỉ có phép): Không cộng thêm vào Streak nhưng giữ cho chuỗi không bị đứt.
3. Best Streak: Chuỗi COMPLETED dài nhất trong lịch sử của thói quen đó.
4. Completion Rate: Số lần COMPLETED chia cho tổng số ngày phải thực hiện trong 30 ngày gần nhất (không tính ngày SKIPPED vào mẫu số).

## 4. Tính năng giao diện
- Dashboard (/): Thanh chọn 7 ngày gần nhất (Date Strip), Thanh tiến độ ngày (Daily Progress Bar) + pháo giấy khi đạt 100%, Danh sách Habit Card (bấm 1 chạm COMPLETED, menu phụ chọn SKIPPED/Note, hiện Streak), Modal Thêm/Sửa thói quen.
- Thống kê (/analytics hoặc Tab): Heatmap 365 ngày và biểu đồ cột tỷ lệ hoàn thành theo các thứ trong tuần.
