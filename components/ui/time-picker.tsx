"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Gera horários de 15 em 15 minutos (8:00 até 20:00)
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      slots.push(`${formattedHour}:${formattedMinute}`);
    }
  }
  return slots;
};

export function TimePicker({
  value,
  onChange,
  disabled,
  placeholder = "Selecione o horário",
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const timeSlots = generateTimeSlots();

  const handleTimeClick = (time: string) => {
    onChange(time);
    setOpen(false);
  };

  // Agrupa horários por período
  const morningSlots = timeSlots.filter((t) => parseInt(t.split(":")[0]) < 12);
  const afternoonSlots = timeSlots.filter(
    (t) => parseInt(t.split(":")[0]) >= 12 && parseInt(t.split(":")[0]) < 18
  );
  const eveningSlots = timeSlots.filter((t) => parseInt(t.split(":")[0]) >= 18);

  const TimeGrid = ({ slots, label }: { slots: string[]; label: string }) => (
    <div className="mb-4">
      <h4 className="text-xs font-semibold text-muted-foreground mb-2 px-1">
        {label}
      </h4>
      <div className="grid grid-cols-4 gap-1">
        {slots.map((time) => (
          <button
            key={time}
            type="button"
            onClick={() => handleTimeClick(time)}
            className={cn(
              "px-2 py-2 text-sm rounded-md transition-colors",
              value === time
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-blue-100 text-gray-700"
            )}
          >
            {time}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <ScrollArea className="h-[320px] p-3">
          <TimeGrid slots={morningSlots} label="☀️ Manhã (8h - 11h45)" />
          <TimeGrid slots={afternoonSlots} label="🌞 Tarde (12h - 17h45)" />
          <TimeGrid slots={eveningSlots} label="🌙 Noite (18h - 20h)" />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
