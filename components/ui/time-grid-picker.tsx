"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeGridPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  selectedDate?: string;
}

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === 20 && minute > 0) break;
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      slots.push(`${formattedHour}:${formattedMinute}`);
    }
  }
  return slots;
};

export function TimeGridPicker({
  value,
  onChange,
  disabled,
  placeholder = "Escolha um horário",
  selectedDate,
}: TimeGridPickerProps) {
  const timeSlots = generateTimeSlots();

  const now = new Date();
  const isToday = selectedDate === now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const isTimePast = (time: string) => {
    if (!isToday) return false;
    const [hour, minute] = time.split(':').map(Number);
    if (hour < currentHour) return true;
    if (hour === currentHour && minute <= currentMinute) return true;
    return false;
  };

  const getTimeLabel = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return `☀️ ${time}`;
    return `🌅 ${time}`;
  };

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-[300px] overflow-y-auto">
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
          ☀️ Manhã
        </div>
        {timeSlots.filter(t => parseInt(t.split(':')[0]) < 12).map((time) => (
          <SelectItem 
            key={time} 
            value={time}
            disabled={isTimePast(time)}
            className={isTimePast(time) ? "text-gray-300" : ""}
          >
            {time}
          </SelectItem>
        ))}
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 mt-1">
          🌅 Tarde
        </div>
        {timeSlots.filter(t => parseInt(t.split(':')[0]) >= 12).map((time) => (
          <SelectItem 
            key={time} 
            value={time}
            disabled={isTimePast(time)}
            className={isTimePast(time) ? "text-gray-300" : ""}
          >
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
