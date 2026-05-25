import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18.2.0";
import { useScrollReveal } from "../components/ScrollReveal.js";
import { useAuth } from "../context/AuthContext.js";
import {
  DEPOSIT_AMOUNT,
  PAYMENT_HOLD_MINUTES,
  PAYMENT_STATUS_PAID,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_REVIEW,
  MANUALLY_BLOCKED_SLOTS,
  TIME_SLOTS,
} from "../constants/index.js";
import { getPassedSlotsForToday } from "../utils/time.js";
import {
  createBookingPayment,
  finalizeBookingPayment,
  getBookingPaymentStatus,
  isSupabaseConfigured,
  supabase,
} from "../lib/supabase.js";

function normalizeBookedSlot(row) {
  if (typeof row === "string") return row;
  return row?.booking_time || "";
}

function mapBookingErrorMessage(error) {
  const message = error?.message || error || "";
  const text = message.toLowerCase();

  if (error?.code === "23505" || text.includes("slot_conflict") || text.includes("duplicate key value")) {
    return "Khung giờ này vừa có người khác đặt trước. Vui lòng chọn giờ khác.";
  }
  if (text.includes("row-level security policy")) {
    return "Bạn chưa có phiên đăng nhập hợp lệ để đặt bàn. Vui lòng đăng xuất và đăng nhập lại.";
  }
  if (text.includes("jwt") || text.includes("token")) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi thử đặt bàn.";
  }
  return message || "Không thể lưu đặt bàn. Vui lòng thử lại.";
}

function DetailRow({ label, value, isCode = false }) {
  return React.createElement(
    "div",
    { className: "qr-detail-row" },
    React.createElement("span", { className: "qr-detail-label" }, label),
    React.createElement(isCode ? "code" : "strong", { className: "qr-detail-value" }, value)
  );
}

export function BookingPage() {
  useScrollReveal();
  const { user } = useAuth();
  const configuredQrImage = globalThis.__BOOKING_CONFIG__?.paymentQrImage || "";
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState("");
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [bookingCode, setBookingCode] = useState("");
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(PAYMENT_STATUS_PENDING);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    date: "",
    time: "18:30",
    guests: 2,
  });
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const passedSlots = useMemo(() => {
    if (form.date !== today) return [];
    return getPassedSlotsForToday();
  }, [form.date, today, currentTime]);

  const unavailableSlots = useMemo(
    () => [...new Set([...MANUALLY_BLOCKED_SLOTS, ...bookedSlots, ...passedSlots])],
    [bookedSlots, passedSlots]
  );

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (form.date === today && passedSlots.includes(form.time)) {
      const firstAvailable = TIME_SLOTS.find((slot) => !unavailableSlots.includes(slot));
      if (firstAvailable) setForm((prev) => ({ ...prev, time: firstAvailable }));
    }
  }, [form.date, form.time, passedSlots, today, unavailableSlots]);

  const qrUrl = useMemo(() => {
    if (paymentInfo?.qr_url) return paymentInfo.qr_url;
    if (configuredQrImage && !isSupabaseConfigured) return configuredQrImage;
    const payload = `EMBER BBQ|${form.name || "Khach"}|${form.date || "NoDate"}|${form.time}|${form.guests} khach`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
  }, [configuredQrImage, form, paymentInfo?.qr_url]);

  const paymentCountdown = useMemo(() => {
    const expiresAt = paymentInfo?.expires_at || paymentInfo?.expiresAt;
    if (!expiresAt) return null;

    const leftMs = new Date(expiresAt).getTime() - currentTime;
    if (leftMs <= 0) {
      return {
        expired: true,
        label: "Đã hết thời gian giữ bàn",
        time: "00:00",
      };
    }

    const minutes = String(Math.floor(leftMs / 60000)).padStart(2, "0");
    const seconds = String(Math.floor((leftMs % 60000) / 1000)).padStart(2, "0");
    return {
      expired: false,
      label: "Giữ bàn còn",
      time: `${minutes}:${seconds}`,
    };
  }, [currentTime, paymentInfo]);

  useEffect(() => {
    let active = true;
    async function loadBookedSlots() {
      if (!isSupabaseConfigured || !form.date || form.date < today) {
        setBookedSlots([]);
        setLoadingSlots(false);
        return;
      }
      setLoadingSlots(true);
      try {
        const { data, error } = await supabase.rpc("get_booked_slots", { target_date: form.date });
        if (!active) return;
        if (error) { setBookedSlots([]); return; }
        setBookedSlots((data || []).map(normalizeBookedSlot).filter(Boolean));
      } catch {
        if (!active) return;
        setBookedSlots([]);
      } finally {
        if (active) setLoadingSlots(false);
      }
    }
    loadBookedSlots();
    return () => { active = false; };
  }, [form.date, today]);

  useEffect(() => {
    if (!showSuccessPopup) return;
    const timer = setTimeout(() => setShowSuccessPopup(false), 3000);
    return () => clearTimeout(timer);
  }, [showSuccessPopup]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setConfirmationMsg("");
    setCompleted(false);

    if (isSupabaseConfigured && !user) {
      setErrorMsg("Bạn cần đăng nhập trước khi đặt bàn để hệ thống lưu lịch sử vào tài khoản.");
      setSubmitted(false);
      return;
    }

    const onlyDigitsPhone = form.phone.replace(/\D/g, "");
    if (!/^\d{9,11}$/.test(onlyDigitsPhone)) {
      setErrorMsg("Số điện thoại chưa hợp lệ (9-11 số). Vui lòng kiểm tra lại.");
      setSubmitted(false);
      return;
    }

    if (!form.date || form.date < today) {
      setErrorMsg("Ngày đặt bàn phải từ hôm nay trở đi.");
      setSubmitted(false);
      return;
    }

    if (unavailableSlots.includes(form.time)) {
      const isPassed = passedSlots.includes(form.time);
      setErrorMsg(isPassed ? "Khung giờ này đã qua. Vui lòng chọn giờ khác." : "Khung giờ này đã kín bàn. Vui lòng chọn giờ khác.");
      setSubmitted(false);
      return;
    }

    const generatedCode = `EMB${Date.now().toString().slice(-6)}`;
    setSaving(true);

    try {
      if (isSupabaseConfigured) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        if (sessionError || !sessionUser) throw new Error("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại trước khi đặt bàn.");

        const { data: latestBookedSlots, error: bookedSlotsError } = await supabase.rpc("get_booked_slots", { target_date: form.date });
        if (bookedSlotsError) throw bookedSlotsError;

        const hasConflict = (latestBookedSlots || []).map(normalizeBookedSlot).some((slot) => slot === form.time);
        if (hasConflict || MANUALLY_BLOCKED_SLOTS.includes(form.time)) throw new Error("SLOT_CONFLICT");

        const result = await createBookingPayment({
          customerName: form.name.trim(),
          phone: onlyDigitsPhone,
          bookingDate: form.date,
          bookingTime: form.time,
          guests: form.guests,
        });

        setBookingCode(result.booking.booking_code);
        setPaymentInfo(result.payment);
        setPaymentStatus(result.payment?.status || result.booking.payment_status || PAYMENT_STATUS_PENDING);
        setConfirmationMsg(result.setupMissing ? result.message : "");
      } else {
        const result = await createBookingPayment({
          customerName: form.name.trim(),
          phone: onlyDigitsPhone,
          bookingDate: form.date,
          bookingTime: form.time,
          guests: form.guests,
        });
        setBookingCode(result.booking.booking_code || generatedCode);
        setPaymentInfo(result.payment);
        setPaymentStatus(result.payment?.status || PAYMENT_STATUS_PENDING);
      }

      setErrorMsg("");
      setSubmitted(true);
      setCompleted(false);
    } catch (error) {
      setErrorMsg(mapBookingErrorMessage(error));
      setSubmitted(false);
    } finally {
      setSaving(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!submitted || !bookingCode || confirmingPayment) return;

    if (!isSupabaseConfigured) {
      setCompleted(true);
      setShowSuccessPopup(true);
      setPaymentStatus(PAYMENT_STATUS_PAID);
      setConfirmationMsg("Đã xác nhận mock. Khi cấu hình Supabase + SePay, hệ thống sẽ tự nhận tiền qua webhook.");
      return;
    }

    setConfirmingPayment(true);
    setErrorMsg("");
    setConfirmationMsg("");

    try {
      const statusResult = await getBookingPaymentStatus({ bookingCode });
      setPaymentInfo(statusResult.payment);
      setPaymentStatus(statusResult.payment?.status || statusResult.booking?.payment_status || PAYMENT_STATUS_PENDING);

      if (
        statusResult.payment?.status === PAYMENT_STATUS_PAID ||
        statusResult.booking?.payment_status === PAYMENT_STATUS_PAID
      ) {
        const result = await finalizeBookingPayment({ bookingCode, userId: user?.id });
        setCompleted(true);
        setShowSuccessPopup(true);
        setConfirmationMsg(result.message);
        return;
      }

      if (statusResult.payment?.status === PAYMENT_STATUS_REVIEW) {
        setCompleted(false);
        setConfirmationMsg("Hệ thống đã thấy giao dịch nhưng cần admin kiểm tra số tiền/nội dung chuyển khoản.");
        return;
      }

      setCompleted(false);
      setConfirmationMsg("Chưa nhận được tiền cọc từ SePay. Vui lòng chuyển khoản đúng nội dung rồi thử lại sau vài giây.");
    } catch (error) {
      setErrorMsg(error?.context?.message || error?.message || "Không thể kiểm tra trạng thái thanh toán.");
      setCompleted(false);
    } finally {
      setConfirmingPayment(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !submitted || !bookingCode || completed) {
      return undefined;
    }

    const timer = setInterval(() => {
      checkPaymentStatus();
    }, 5000);

    return () => clearInterval(timer);
  }, [bookingCode, completed, submitted, confirmingPayment]);

  return React.createElement(
    "div",
    { className: "container section booking-layout" },
    React.createElement(
      "section",
      { className: "panel reveal" },
      React.createElement("h1", null, "Đặt Bàn"),
      isSupabaseConfigured
        ? React.createElement("p", { className: "muted" }, user ? `Đơn đặt bàn sẽ được lưu vào Supabase cho ${user.name}.` : "Hãy đăng nhập trước để đơn đặt bàn được gắn vào lịch sử của bạn.")
        : null,
      React.createElement(
        "form",
        { className: "booking-form", onSubmit },
        React.createElement("input", { required: true, placeholder: "Họ và tên", value: form.name, onChange: (e) => setForm((p) => ({ ...p, name: e.target.value })) }),
        React.createElement("input", { required: true, placeholder: "Số điện thoại", value: form.phone, onChange: (e) => setForm((p) => ({ ...p, phone: e.target.value })) }),
        React.createElement("input", { required: true, type: "date", min: today, value: form.date, onChange: (e) => setForm((p) => ({ ...p, date: e.target.value })) }),
        React.createElement(
          "select",
          { value: form.time, onChange: (e) => setForm((p) => ({ ...p, time: e.target.value })) },
          TIME_SLOTS.map((slot) => {
            const isPassed = passedSlots.includes(slot);
            const isBooked = bookedSlots.includes(slot);
            const isBlocked = MANUALLY_BLOCKED_SLOTS.includes(slot);
            const isUnavailable = isPassed || isBooked || isBlocked;
            let label = slot;
            if (isPassed) label = `${slot} (Đã qua)`;
            else if (isBooked || isBlocked) label = `${slot} (Đã kín)`;
            return React.createElement("option", { key: slot, value: slot, disabled: isUnavailable }, label);
          })
        ),
        React.createElement(
          "select",
          { value: form.guests, onChange: (e) => setForm((p) => ({ ...p, guests: Number(e.target.value) })) },
          Array.from({ length: 12 }).map((_, i) => React.createElement("option", { key: i + 1, value: i + 1 }, `${i + 1} khách`))
        ),
        React.createElement(
          "p",
          { className: "slot-hint" },
          loadingSlots && form.date
            ? "Đang kiểm tra các khung giờ đã được đặt."
            : form.date === today && passedSlots.length > 0
              ? `Khung giờ đã qua sẽ tự động khóa. Hiện tại: ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
              : "Khung giờ đã có người đặt sẽ tự khóa để tránh trùng lịch."
        ),
        React.createElement("button", { type: "submit", className: "btn-gold", disabled: saving }, saving ? "Đang lưu..." : "Xác nhận đặt bàn")
      ),
      errorMsg ? React.createElement("p", { className: "error-msg" }, errorMsg) : null,
      submitted
        ? React.createElement(
            "div",
            { className: "booking-result" },
            React.createElement("h3", null, "Giữ bàn thành công"),
            React.createElement("p", null, `Mã đặt bàn: ${bookingCode}`),
            paymentInfo?.payment_code
              ? React.createElement("p", null, `Nội dung chuyển khoản: ${paymentInfo.payment_code}`)
              : null,
            React.createElement("p", null, `Thông tin: ${form.name} - ${form.date} lúc ${form.time} - ${form.guests} khách`),
            React.createElement("p", null, `Bàn sẽ được giữ ${PAYMENT_HOLD_MINUTES} phút để chờ thanh toán cọc.`)
          )
        : null
    ),
    React.createElement(
      "aside",
      { className: "panel qr-panel reveal" },
      React.createElement("h2", null, "QR thanh toán"),
      React.createElement("img", { src: qrUrl, alt: "QR thanh toán" }),
      React.createElement(
        "div",
        { className: "qr-payment-details" },
        React.createElement(DetailRow, { label: "Tiền cọc", value: `${DEPOSIT_AMOUNT.toLocaleString("vi-VN")} VND` }),
        paymentInfo?.bank_account
          ? React.createElement(DetailRow, { label: "TK nhận", value: `${paymentInfo.bank_account}${paymentInfo.bank_account_name ? ` - ${paymentInfo.bank_account_name}` : ""}` })
          : React.createElement("p", { className: "muted qr-setup-note" }, "QR thanh toán sẽ hiển thị sau khi nhà hàng hoàn tất kết nối ngân hàng."),
        paymentInfo?.payment_code
          ? React.createElement(DetailRow, { label: "Nội dung", value: paymentInfo.payment_code, isCode: true })
          : null
      ),
      paymentCountdown
        ? React.createElement(
            "div",
            { className: `payment-countdown${paymentCountdown.expired ? " is-expired" : ""}`, role: "timer", "aria-live": "polite" },
            React.createElement("span", null, paymentCountdown.label),
            React.createElement("strong", null, paymentCountdown.time)
          )
        : null,
      submitted
        ? React.createElement(
            "div",
            { className: "payment-status-line" },
            React.createElement("span", null, "Trạng thái"),
            React.createElement("strong", null, paymentStatus)
          )
        : null,
      React.createElement("button", { className: "btn-gold qr-done-btn", type: "button", onClick: checkPaymentStatus, disabled: !submitted || confirmingPayment }, confirmingPayment ? "Đang kiểm tra..." : "Kiểm tra thanh toán"),
      confirmationMsg ? React.createElement("p", { className: completed ? "success-msg" : "slot-hint" }, confirmationMsg) : null,
      completed ? React.createElement("p", { className: "success-msg" }, "Đã nhận cọc. Đơn đang chờ admin duyệt.") : null
    ),
    React.createElement(
      "section",
      { className: "panel floor-plan-panel reveal" },
      React.createElement("div", { className: "floor-plan-heading" }, React.createElement("h2", null, "Sơ đồ không gian Ember BBQ"), React.createElement("p", { className: "muted" }, "Khách có thể xem trước khu vực bàn, lối đi, quầy bar, bếp và phòng VIP trước khi đặt.")),
      React.createElement("div", { className: "floor-plan-frame" }, React.createElement("img", { src: "./assets/images/ember-bbq-floor-plan.png", alt: "Sơ đồ không gian nhà hàng Ember BBQ", loading: "lazy" }))
    ),
    showSuccessPopup
      ? React.createElement(
          "div",
          { className: "booking-success-popup", role: "status", "aria-live": "polite" },
          React.createElement(
            "div",
            { className: "booking-success-card" },
            React.createElement("div", { className: "booking-success-check" }, React.createElement("svg", { viewBox: "0 0 120 120", "aria-hidden": "true", focusable: "false" }, React.createElement("circle", { cx: "60", cy: "60", r: "48" }), React.createElement("path", { d: "M36 61 L54 78 L86 40" }))),
            React.createElement("p", null, "success")
          )
        )
      : null
  );
}
