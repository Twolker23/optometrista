"use client";

import * as React from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = "Selecione a data",
}: DatePickerProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  
  return (
    <div className="relative">
      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none z-10" />
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={today}
        disabled={disabled}
        className={cn(
          "pl-10 cursor-pointer",
          !value && "text-muted-foreground"
        )}
      />
    </div>
  );
}
