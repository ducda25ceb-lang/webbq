import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18.2.0";
import { useScrollReveal } from "../components/ScrollReveal.js";
import { useAuth } from "../context/AuthContext.js";
import {
  BOOKING_STATUS_PENDING_QR,
  finalizeBookingPayment,
  isSupabaseConfigured,
  supabase,
} from "../lib/supabase.js";

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
    return "Khung gi\u1edd n\u00e0y v\u1eeba c\u00f3 ng\u01b0\u1eddi kh\u00e1c \u0111\u1eb7t tr\u01b0\u1edbc. Vui l\u00f2ng ch\u1ecdn gi\u1edd kh\u00e1c.";
  }

  if (text.includes("row-level security policy")) {
    return "B\u1ea1n ch\u01b0a c\u00f3 phi\u00ean \u0111\u0103ng nh\u1eadp h\u1ee3p l\u1ec7 \u0111\u1ec3 \u0111\u1eb7t b\u00e0n. Vui l\u00f2ng \u0111\u0103ng xu\u1ea5t v\u00e0 \u0111\u0103ng nh\u1eadp l\u1ea1i.";
  }

  if (text.includes("jwt") || text.includes("token")) {
    return "Phi\u00ean \u0111\u0103ng nh\u1eadp \u0111\u00e3 h\u1ebft h\u1ea1n. Vui l\u00f2ng \u0111\u0103ng nh\u1eadp l\u1ea1i r\u1ed3i th\u1eed \u0111\u1eb7t b\u00e0n.";
  }

  return message || "Kh\u00f4ng th\u1ec3 l\u01b0u \u0111\u1eb7t b\u00e0n. Vui l\u00f2ng th\u1eed l\u1ea1i.";
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
    if (configuredQrImage) {
      return configuredQrImage;
    }

    const payload = `EMBER BBQ|${form.name || "Khach"}|${form.date || "NoDate"}|${form.time}|${form.guests} khach`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
  }, [configuredQrImage, form]);

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

  useEffect(() => {
    if (!showSuccessPopup) {
      return undefined;
    }

    const popupTimer = setTimeout(() => {
      setShowSuccessPopup(false);
    }, 3000);

    return () => clearTimeout(popupTimer);
  }, [showSuccessPopup]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setConfirmationMsg("");
    setCompleted(false);

    if (isSupabaseConfigured && !user) {
      setErrorMsg(
        "B\u1ea1n c\u1ea7n \u0111\u0103ng nh\u1eadp tr\u01b0\u1edbc khi \u0111\u1eb7t b\u00e0n \u0111\u1ec3 h\u1ec7 th\u1ed1ng l\u01b0u l\u1ecbch s\u1eed v\u00e0o t\u00e0i kho\u1ea3n.",
      );
      setSubmitted(false);
      return;
    }

    const onlyDigitsPhone = form.phone.replace(/\D/g, "");

    if (!/^\d{9,11}$/.test(onlyDigitsPhone)) {
      setErrorMsg(
        "S\u1ed1 \u0111i\u1ec7n tho\u1ea1i ch\u01b0a h\u1ee3p l\u1ec7 (9-11 s\u1ed1). Vui l\u00f2ng ki\u1ec3m tra l\u1ea1i.",
      );
      setSubmitted(false);
      return;
    }

    if (!form.date || form.date < today) {
      setErrorMsg("Ng\u00e0y \u0111\u1eb7t b\u00e0n ph\u1ea3i t\u1eeb h\u00f4m nay tr\u1edf \u0111i.");
      setSubmitted(false);
      return;
    }

    if (unavailableSlots.includes(form.time)) {
      setErrorMsg("Khung gi\u1edd n\u00e0y \u0111\u00e3 k\u00edn b\u00e0n. Vui l\u00f2ng ch\u1ecdn gi\u1edd kh\u00e1c.");
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
            "Phi\u00ean \u0111\u0103ng nh\u1eadp kh\u00f4ng h\u1ee3p l\u1ec7. Vui l\u00f2ng \u0111\u0103ng nh\u1eadp l\u1ea1i tr\u01b0\u1edbc khi \u0111\u1eb7t b\u00e0n.",
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
          status: BOOKING_STATUS_PENDING_QR,
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

  const onComplete = async () => {
    if (!submitted || !bookingCode || confirmingPayment) {
      return;
    }

    if (!isSupabaseConfigured) {
      setCompleted(true);
      setShowSuccessPopup(true);
      setConfirmationMsg(
        "\u0110\u00e3 x\u00e1c nh\u1eadn \u0111\u1eb7t b\u00e0n. Email x\u00e1c nh\u1eadn ch\u1ec9 ho\u1ea1t \u0111\u1ed9ng khi Supabase \u0111\u01b0\u1ee3c c\u1ea5u h\u00ecnh.",
      );
      return;
    }

    setConfirmingPayment(true);
    setErrorMsg("");
    setConfirmationMsg("");

    try {
      const result = await finalizeBookingPayment({
        bookingCode,
        userId: user?.id,
      });

      setCompleted(true);
      setShowSuccessPopup(true);
      setConfirmationMsg(result.message);
    } catch (error) {
      const message =
        error?.context?.message ||
        error?.message ||
        "Kh\u00f4ng th\u1ec3 ho\u00e0n t\u1ea5t \u0111\u1eb7t b\u00e0n sau khi qu\u00e9t QR.";
      setErrorMsg(message);
      setCompleted(false);
    } finally {
      setConfirmingPayment(false);
    }
  };

  return React.createElement(
    "div",
    { className: "container section booking-layout" },
    React.createElement(
      "section",
      { className: "panel reveal" },
      React.createElement("h1", null, "\u0110\u1eb7t B\u00e0n"),
      isSupabaseConfigured
        ? React.createElement(
            "p",
            { className: "muted" },
            user
              ? `\u0110\u01a1n \u0111\u1eb7t b\u00e0n s\u1ebd \u0111\u01b0\u1ee3c l\u01b0u v\u00e0o Supabase cho ${user.name}.`
              : "H\u00e3y \u0111\u0103ng nh\u1eadp tr\u01b0\u1edbc \u0111\u1ec3 \u0111\u01a1n \u0111\u1eb7t b\u00e0n \u0111\u01b0\u1ee3c g\u1eafn v\u00e0o l\u1ecbch s\u1eed c\u1ee7a b\u1ea1n.",
          )
        : null,
      React.createElement(
        "form",
        { className: "booking-form", onSubmit: onSubmit },
        React.createElement("input", {
          required: true,
          placeholder: "H\u1ecd v\u00e0 t\u00ean",
          value: form.name,
          onChange: (event) =>
            setForm((previous) => ({ ...previous, name: event.target.value })),
        }),
        React.createElement("input", {
          required: true,
          placeholder: "S\u1ed1 \u0111i\u1ec7n tho\u1ea1i",
          value: form.phone,
          onChange: (event) =>
            setForm((previous) => ({
              ...previous,
              phone: event.target.value,
            })),
        }),
        React.createElement("input", {
          required: true,
          type: "date",
          min: today,
          value: form.date,
          onChange: (event) =>
            setForm((previous) => ({ ...previous, date: event.target.value })),
        }),
        React.createElement(
          "select",
          {
            value: form.time,
            onChange: (event) =>
              setForm((previous) => ({ ...previous, time: event.target.value })),
          },
          timeSlots.map((slot) =>
            React.createElement(
              "option",
              {
                key: slot,
                value: slot,
                disabled: unavailableSlots.includes(slot),
              },
              unavailableSlots.includes(slot)
                ? `${slot} (\u0110\u00e3 k\u00edn)`
                : slot,
            ),
          ),
        ),
        React.createElement(
          "select",
          {
            value: form.guests,
            onChange: (event) =>
              setForm((previous) => ({
                ...previous,
                guests: Number(event.target.value),
              })),
          },
          Array.from({ length: 12 }).map((_, index) => {
            const guest = index + 1;
            return React.createElement(
              "option",
              { key: guest, value: guest },
              `${guest} kh\u00e1ch`,
            );
          }),
        ),
        React.createElement(
          "p",
          { className: "slot-hint" },
          loadingSlots && form.date
            ? "\u0110ang ki\u1ec3m tra c\u00e1c khung gi\u1edd \u0111\u00e3 \u0111\u01b0\u1ee3c \u0111\u1eb7t."
            : "Khung gi\u1edd \u0111\u00e3 c\u00f3 ng\u01b0\u1eddi \u0111\u1eb7t s\u1ebd t\u1ef1 kh\u00f3a \u0111\u1ec3 tr\u00e1nh tr\u00f9ng l\u1ecbch.",
        ),
        React.createElement(
          "button",
          { type: "submit", className: "btn-gold", disabled: saving },
          saving ? "\u0110ang l\u01b0u..." : "X\u00e1c nh\u1eadn \u0111\u1eb7t b\u00e0n",
        ),
      ),
      errorMsg
        ? React.createElement("p", { className: "error-msg" }, errorMsg)
        : null,
      submitted
        ? React.createElement(
            "div",
            { className: "booking-result" },
            React.createElement("h3", null, "Gi\u1eef b\u00e0n th\u00e0nh c\u00f4ng"),
            React.createElement("p", null, `M\u00e3 \u0111\u1eb7t b\u00e0n: ${bookingCode}`),
            React.createElement(
              "p",
              null,
              `Th\u00f4ng tin: ${form.name} - ${form.date} l\u00fac ${form.time} - ${form.guests} kh\u00e1ch`,
            ),
            React.createElement(
              "p",
              null,
              "B\u00e0n s\u1ebd \u0111\u01b0\u1ee3c gi\u1eef trong 15 ph\u00fat k\u1ec3 t\u1eeb gi\u1edd h\u1eb9n. Vui l\u00f2ng qu\u00e9t QR \u0111\u1ec3 c\u1ecdc b\u00e0n.",
            ),
          )
        : null,
    ),
    React.createElement(
      "aside",
      { className: "panel qr-panel reveal" },
      React.createElement("h2", null, "QR thanh to\u00e1n"),
      React.createElement("img", { src: qrUrl, alt: "QR thanh to\u00e1n" }),
      React.createElement(
        "p",
        null,
        "Sau khi \u0111\u1eb7t b\u00e0n, b\u1ea1n c\u00f3 th\u1ec3 qu\u00e9t m\u00e3 QR n\u00e0y \u0111\u1ec3 thanh to\u00e1n ti\u1ec1n c\u1ecdc 100.000 VND. B\u1ea5m Ho\u00e0n t\u1ea5t QR \u0111\u1ec3 admin ki\u1ec3m tra; email x\u00e1c nh\u1eadn ch\u1ec9 \u0111\u01b0\u1ee3c g\u1eedi sau khi admin ch\u1ea5p nh\u1eadn.",
      ),
      React.createElement(
        "button",
        {
          className: "btn-gold qr-done-btn",
          type: "button",
          onClick: onComplete,
          disabled: !submitted || confirmingPayment,
        },
        confirmingPayment ? "\u0110ang x\u1eed l\u00fd..." : "Ho\u00e0n t\u1ea5t QR",
      ),
      completed
        ? React.createElement(
            "p",
            { className: "success-msg" },
            confirmationMsg ||
              "C\u1ea3m \u01a1n b\u1ea1n. \u0110\u1eb7t b\u00e0n \u0111\u00e3 \u0111\u01b0\u1ee3c ho\u00e0n t\u1ea5t.",
          )
        : null,
    ),
    showSuccessPopup
      ? React.createElement(
          "div",
          {
            className: "booking-success-popup",
            role: "status",
            "aria-live": "polite",
          },
          React.createElement(
            "div",
            { className: "booking-success-card" },
            React.createElement(
              "div",
              { className: "booking-success-check" },
              React.createElement(
                "svg",
                {
                  viewBox: "0 0 120 120",
                  "aria-hidden": "true",
                  focusable: "false",
                },
                React.createElement("circle", {
                  cx: "60",
                  cy: "60",
                  r: "48",
                }),
                React.createElement("path", {
                  d: "M36 61 L54 78 L86 40",
                }),
              ),
            ),
            React.createElement("p", null, "success"),
          ),
        )
      : null,
  );
}
