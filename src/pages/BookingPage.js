import React, { useMemo, useState } from "https://esm.sh/react@18.2.0";
import { useScrollReveal } from "../components/ScrollReveal.js";

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

const blockedSlots = ["19:30"];

export function BookingPage() {
  useScrollReveal();
  const [submitted, setSubmitted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [bookingCode, setBookingCode] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    date: "",
    time: "18:30",
    guests: 2,
  });

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const qrUrl = useMemo(() => {
    const payload = `EMBER BBQ|${form.name || "Khách"}|${form.date || "NoDate"}|${form.time}|${form.guests}khách`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
  }, [form]);

  const onSubmit = (e) => {
    e.preventDefault();
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

    if (blockedSlots.includes(form.time)) {
      setErrorMsg("Khung giờ này đã kín bàn. Vui lòng chọn giờ khác.");
      setSubmitted(false);
      return;
    }

    setErrorMsg("");
    setSubmitted(true);
    setCompleted(false);
    setBookingCode(`EMB${Date.now().toString().slice(-6)}`);
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
                disabled: blockedSlots.includes(slot),
              },
              blockedSlots.includes(slot) ? `${slot} (Đã kín)` : slot,
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
          "Khung 19:30 đang kín, hệ thống tự khóa để tránh đặt trùng.",
        ),
        React.createElement(
          "button",
          { type: "submit", className: "btn-gold" },
          "Xác nhận đặt bàn",
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
