create or replace function public.cancel_booking_by_code(target_booking_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  is_current_admin boolean := public.is_admin();
  now_value timestamptz := now();
  cancelled_booking record;
begin
  if current_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'Bạn cần đăng nhập để hủy bàn.'
    );
  end if;

  if target_booking_code is null or btrim(target_booking_code) = '' then
    return jsonb_build_object(
      'ok', false,
      'error', 'Thiếu mã đặt bàn.'
    );
  end if;

  update public.bookings
  set status = 'Đã hủy - mất cọc',
      payment_status = 'Đã hủy',
      admin_updated_at = now_value,
      admin_updated_by = current_user_id,
      updated_at = now_value
  where booking_code = target_booking_code
    and status <> 'Đã hủy - mất cọc'
    and (is_current_admin or user_id = current_user_id)
  returning id, booking_code
  into cancelled_booking;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'Không tìm thấy đơn hoặc đơn đã hủy.'
    );
  end if;

  update public.payments
  set status = 'Đã hủy',
      updated_at = now_value
  where booking_id = cancelled_booking.id;

  return jsonb_build_object(
    'ok', true,
    'bookingCode', cancelled_booking.booking_code,
    'message', 'Đặt bàn đã được hủy. Khoản cọc sẽ không được hoàn lại theo chính sách.'
  );
end;
$$;

revoke all on function public.cancel_booking_by_code(text) from public;
grant execute on function public.cancel_booking_by_code(text) to authenticated;
