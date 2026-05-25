# Ember BBQ Production Setup

## Mục Tiêu

Đưa Ember BBQ từ web đặt bàn demo lên luồng vận hành thật:

- khách phải đăng nhập trước khi đặt bàn;
- tiền cọc cố định 100.000 VND;
- thanh toán được xác nhận bằng SePay webhook, không tin vào nút bấm của khách;
- đơn đã nhận cọc chuyển sang chờ admin duyệt;
- admin duyệt hoặc hủy đơn trong dashboard;
- khách và admin nhận email ở các bước cần thông báo.

## Supabase

Chạy migration theo đúng thứ tự:

1. `0001_init.sql`
2. `0002_booking_slot_conflict.sql`
3. `0003_booking_confirmation_email.sql`
4. `0004_booking_cancellation.sql`
5. `0005_menu_comment_rating.sql`
6. `0006_admin_booking_access.sql`
7. `0007_admin_contact_access.sql`
8. `0008_production_payment_ops.sql`

Deploy Edge Functions:

```bash
supabase functions deploy create-booking-payment
supabase functions deploy booking-payment-status
supabase functions deploy sepay-webhook
supabase functions deploy cancel-booking
supabase functions deploy send-booking-confirmation
```

Điền secrets:

```bash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_ANON_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set ADMIN_EMAILS=ducanh12082007dn@gmail.com
supabase secrets set SEPAY_BANK_ACCOUNT=...
supabase secrets set SEPAY_BANK_CODE=...
supabase secrets set SEPAY_BANK_ACCOUNT_NAME=...
supabase secrets set SEPAY_WEBHOOK_SECRET=...
supabase secrets set RESEND_API_KEY=...
supabase secrets set BOOKING_FROM_EMAIL="Ember BBQ <booking@your-domain.com>"
```

Dùng `SEPAY_WEBHOOK_API_KEY` thay cho `SEPAY_WEBHOOK_SECRET` chỉ khi bạn chọn xác thực API Key trong SePay.

## SePay

Tạo webhook trong SePay:

- URL: `https://YOUR_PROJECT_ID.functions.supabase.co/sepay-webhook`
- Method: `POST`
- Security: khuyến nghị `HMAC-SHA256`
- Secret: cùng giá trị với `SEPAY_WEBHOOK_SECRET`

Format QR app đang dùng:

```text
https://qr.sepay.vn/img?acc=ACCOUNT&bank=BANK&amount=100000&des=PAYMENT_CODE
```

Mỗi đơn có một mã thanh toán riêng bắt đầu bằng `EBBQ`.

## Vercel

Frontend là static app. Sau khi push lên GitHub, Vercel sẽ redeploy tự động nếu project đã liên kết sẵn.

Kiểm tra `index.html` đang chứa Supabase URL và publishable/anon key của production.

URL production cần verify:

```text
https://webbq.vercel.app/
```

## Test Production Thủ Công

1. Open production URL.
2. Đăng nhập bằng tài khoản khách thật.
3. Tạo một đơn đặt bàn.
4. Kiểm tra QR có số tài khoản, nội dung chuyển khoản và cọc 100.000 VND.
5. Chuyển khoản đúng nội dung.
6. Chờ SePay webhook.
7. Kiểm tra dashboard khách chuyển từ chờ thanh toán sang chờ admin.
8. Đăng nhập admin.
9. Duyệt đơn.
10. Kiểm tra email xác nhận đã gửi cho khách.

## Test Không Cần Chuyển Tiền Thật

Chỉ bật khi test:

```bash
supabase secrets set ALLOW_UNVERIFIED_SEPAY_WEBHOOK=true
```

Sau đó gửi webhook test:

```bash
curl -X POST "https://YOUR_PROJECT_ID.functions.supabase.co/sepay-webhook" \
  -H "Content-Type: application/json" \
  -d '{"id":"TEST-001","transferAmount":100000,"content":"EBBQYOURCODE","accountNumber":"YOUR_BANK_ACCOUNT_NUMBER"}'
```

Tắt lại trước khi chạy thật:

```bash
supabase secrets set ALLOW_UNVERIFIED_SEPAY_WEBHOOK=false
```
