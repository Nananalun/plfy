'use client';

import { useState, useEffect } from 'react';

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({
    hours: '00',
    minutes: '00',
    seconds: '00'
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date();
      
      // Set target to today's 12:00 PM
      target.setHours(12, 0, 0, 0);

      // If it's already past 12:00 PM, set target to tomorrow 12:00 PM
      if (now.getTime() > target.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      const difference = target.getTime() - now.getTime();

      if (difference > 0) {
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft({
          hours: hours.toString().padStart(2, '0'),
          minutes: minutes.toString().padStart(2, '0'),
          seconds: seconds.toString().padStart(2, '0')
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-white bg-red-800 px-3 py-1 rounded text-sm font-bold ml-4">
      <span className="text-xs font-normal opacity-80">距离结束仅剩</span>
      <div className="flex items-center gap-1 font-mono">
        <span className="bg-black/20 px-1 rounded">{timeLeft.hours}</span>
        <span>:</span>
        <span className="bg-black/20 px-1 rounded">{timeLeft.minutes}</span>
        <span>:</span>
        <span className="bg-black/20 px-1 rounded">{timeLeft.seconds}</span>
      </div>
    </div>
  );
}

