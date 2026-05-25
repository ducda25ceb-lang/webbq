import { useEffect, useState } from "https://esm.sh/react@18.2.0";

/**
 * Hook để lấy thời gian hiện tại và tự động cập nhật
 * @param {number} intervalMs - Khoảng thời gian cập nhật (ms), mặc định 60 giây
 * @returns {number} Timestamp hiện tại
 */
export function useCurrentTime(intervalMs = 60000) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return currentTime;
}
