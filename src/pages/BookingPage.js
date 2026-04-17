import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18.2.0";
import { useScrollReveal } from "../components/ScrollReveal.js";
import { useAuth } from "../context/AuthContext.js";
import { isSupabaseConfigured, supabase } from "../lib/supabase.js";

const timeSlots = [
  "11:00",
  "12:00",
  "13:00",
  "17:30",
  "18:30",
  "19:30",
  "20:30",
  "21:30",
];

const manuallyBlockedSlots = ["19:30"];

function normalizeBookedSlot(row) {
  if (typeof row === "string") {
    return row;
  }

  return row?.booking_time || "";
}

function mapBookingErrorMessage(error) {
  const message = error?.message || error || "";
  const text = message.toLowerCase();

  if (
    error?.code === "23505" ||
    text.includes("slot_conflict") ||
    text.includes("duplicate key value")
  ) {
    return "Khung giờ này vừa có người khác đặt trước. Vui lòng chọn giờ khác.";
  }

  if (text.includes("row-level security policy")) {
    return "Bạn chưa có phiên đăng nhập hợp lệ để đặt bàn. Vui lòng đăng xuất, đăng nhập lại và xác thực email (nếu được yêu cầu).";
  }

  if (text.includes("jwt") || text.includes("token")) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi thử đặt bàn.";
  }

  return message || "Không thể lưu đặt bàn. Vui lòng thử lại.";
}

export function BookingPage() {
  useScrollReveal();
  const { user } = useAuth();
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [bookingCode, setBookingCode] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    date: "",
    time: "18:30",
    guests: 2,
  });

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const unavailableSlots = useMemo(
    () => [...new Set([...manuallyBlockedSlots, ...bookedSlots])],
    [bookedSlots],
  );

  const qrUrl = useMemo(() => {
    const payload = `EMBER BBQ|${form.name || "Khách"}|${form.date || "NoDate"}|${form.time}|${form.guests}khách`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
  }, [form]);

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
        const { data, error } = await supabase.rpc("get_booked_slots", {
          target_date: form.date,
        });

        if (!active) {
          return;
        }

        if (error) {
          setBookedSlots([]);
          return;
        }

        setBookedSlots((data || []).map(normalizeBookedSlot).filter(Boolean));
      } catch {
        if (!active) {
          return;
        }

        setBookedSlots([]);
      } finally {
        if (active) {
          setLoadingSlots(false);
        }
      }
    }

    loadBookedSlots();

    return () => {
      active = false;
    };
  }, [form.date, today]);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (isSupabaseConfigured && !user) {
      setErrorMsg(
        "Bạn cần đăng nhập trước khi đặt bàn để hệ thống lưu lịch sử vào tài khoản.",
      );
      setSubmitted(false);
      return;
    }

    const onlyDigitsPhone = form.phone.replace(/\D/g, "");

    if (!/^\d{9,11}$/.test(onlyDigitsPhone)) {
      setErrorMsg(
        "Số điện thoại chưa hợp lệ (9-11 số). Vui lòng kiểm tra lại.",
      );
      setSubmitted(false);
      return;
    }

    if (!form.date || form.date < today) {
      setErrorMsg("Ngày đặt bàn phải từ hôm nay trở đi.");
      setSubmitted(false);
      return;
    }

    if (unavailableSlots.includes(form.time)) {
      setErrorMsg("Khung giờ này đã kín bàn. Vui lòng chọn giờ khác.");
      setSubmitted(false);
      return;
    }

    const generatedCode = `EMB${Date.now().toString().slice(-6)}`;

    setSaving(true);

    try {
      if (isSupabaseConfigured) {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;

        if (sessionError || !sessionUser) {
          throw new Error(
            "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại trước khi đặt bàn.",
          );
        }

        const { data: latestBookedSlots, error: bookedSlotsError } =
          await supabase.rpc("get_booked_slots", {
            target_date: form.date,
          });

        if (bookedSlotsError) {
          throw bookedSlotsError;
        }

        const hasConflict = (latestBookedSlots || [])
          .map(normalizeBookedSlot)
          .some((slot) => slot === form.time);

        if (hasConflict || manuallyBlockedSlots.includes(form.time)) {
          throw new Error("SLOT_CONFLICT");
        }

        const payload = {
          booking_code: generatedCode,
          user_id: sessionUser.id,
          customer_name: form.name.trim(),
          customer_email: sessionUser.email || user?.email || null,
          phone: onlyDigitsPhone,
          booking_date: form.date,
          booking_time: form.time,
          guests: form.guests,
          status: "Đang chờ",
        };

        const { error } = await supabase.from("bookings").insert(payload);

        if (error) {
          throw error;
        }
      }

      setErrorMsg("");
      setSubmitted(true);
      setCompleted(false);
      setBookingCode(generatedCode);
    } catch (error) {
      setErrorMsg(mapBookingErrorMessage(error));
      setSubmitted(false);
    } finally {
      setSaving(false);
    }
  };

  const onComplete = () => {
    setCompleted(true);
  };

  return React.createElement(
    "div",
    { className: "container section booking-layout" },
    React.createElement(
      "section",
      { className: "panel reveal" },
      React.createElement("h1", null, "Đặt Bàn"),
      isSupabaseConfigured
        ? React.createElement(
            "p",
            { className: "muted" },
            user
              ? `Đơn đặt bàn sẽ được lưu vào Supabase cho ${user.name}.`
              : "Hãy đăng nhập trước để đơn đặt bàn được gắn vào lịch sử của bạn.",
          )
        : null,
      React.createElement(
        "form",
        { className: "booking-form", onSubmit: onSubmit },
        React.createElement("input", {
          required: true,
          placeholder: "Họ và tên",
          value: form.name,
          onChange: (e) => setForm((p) => ({ ...p, name: e.target.value })),
        }),
        React.createElement("input", {
          required: true,
          placeholder: "Số điện thoại",
          value: form.phone,
          onChange: (e) => setForm((p) => ({ ...p, phone: e.target.value })),
        }),
        React.createElement("input", {
          required: true,
          type: "date",
          min: today,
          value: form.date,
          onChange: (e) => setForm((p) => ({ ...p, date: e.target.value })),
        }),
        React.createElement(
          "select",
          {
            value: form.time,
            onChange: (e) => setForm((p) => ({ ...p, time: e.target.value })),
          },
          timeSlots.map((slot) =>
            React.createElement(
              "option",
              {
                key: slot,
                value: slot,
                disabled: unavailableSlots.includes(slot),
              },
              unavailableSlots.includes(slot) ? `${slot} (Đã kín)` : slot,
            ),
          ),
        ),
        React.createElement(
          "select",
          {
            value: form.guests,
            onChange: (e) =>
              setForm((p) => ({ ...p, guests: Number(e.target.value) })),
          },
          Array.from({ length: 12 }).map((_, idx) => {
            const guest = idx + 1;
            return React.createElement(
              "option",
              { key: guest, value: guest },
              `${guest} khách`,
            );
          }),
        ),
        React.createElement(
          "p",
          { className: "slot-hint" },
          loadingSlots && form.date
            ? "Đang kiểm tra các khung giờ đã được đặt."
            : "Khung giờ đã có người đặt sẽ tự khóa để tránh trùng lịch.",
        ),
        React.createElement(
          "button",
          { type: "submit", className: "btn-gold", disabled: saving },
          saving ? "Đang lưu..." : "Xác nhận đặt bàn",
        ),
      ),
      errorMsg
        ? React.createElement("p", { className: "error-msg" }, errorMsg)
        : null,
      submitted &&
        React.createElement(
          "div",
          { className: "booking-result" },
          React.createElement("h3", null, "Giữ bàn thành công"),
          React.createElement("p", null, `Mã đặt bàn: ${bookingCode}`),
          React.createElement(
            "p",
            null,
            `Thông tin: ${form.name} - ${form.date} lúc ${form.time} - ${form.guests} khách`,
          ),
          React.createElement(
            "p",
            null,
            "Bàn sẽ được giữ trong 15 phút kể từ giờ hẹn. Vui lòng quét QR để cọc bàn.",
          ),
        ),
    ),
    React.createElement(
      "aside",
      { className: "panel qr-panel reveal" },
      React.createElement("h2", null, "QR thanh toán"),
      React.createElement("img", { src: qrUrl, alt: "QR thanh toán" }),
      React.createElement(
        "p",
        null,
        "Sau khi đặt bàn, bạn có thể quét mã QR này để thanh toán tiền cọc 100.000 VND.",
      ),
      React.createElement(
        "button",
        {
          className: "btn-gold qr-done-btn",
          type: "button",
          onClick: onComplete,
          disabled: !submitted,
        },
        "Hoàn thành",
      ),
      completed
        ? React.createElement(
            "p",
            { className: "success-msg" },
            "Cảm ơn bạn. Đặt bàn đã được hoàn tất.",
          )
        : null,
    ),
  );
}
