"use client";

import * as React from "react";
import { format, isSaturday, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SaturdayDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function SaturdayDatePicker({
  value,
  onChange,
  disabled,
  placeholder = "Selecione um sábado",
}: SaturdayDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const selectedDate = value ? new Date(value + "T12:00:00") : null;
  const today = startOfDay(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Preencher dias vazios no início da semana
  const startDayOfWeek = getDay(monthStart);
  const emptyDays = Array(startDayOfWeek).fill(null);

  const handleDateClick = (date: Date) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    onChange(formattedDate);
    setOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const isDateSelectable = (date: Date) => {
    return isSaturday(date) && (isAfter(date, today) || isSameDay(date, today));
  };

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
          <Calendar className="mr-2 h-4 w-4" />
          {selectedDate
            ? format(selectedDate, "dd/MM/yyyy (EEEE)", { locale: ptBR })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          {/* Header com navegação */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold text-sm">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
              <div
                key={day}
                className={cn(
                  "text-center text-xs font-medium py-1",
                  day === "Sáb" ? "text-blue-600" : "text-muted-foreground"
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Dias do mês */}
          <div className="grid grid-cols-7 gap-1">
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="h-8 w-8" />
            ))}
            {days.map((date) => {
              const selectable = isDateSelectable(date);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isSat = isSaturday(date);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => selectable && handleDateClick(date)}
                  disabled={!selectable}
                  className={cn(
                    "h-8 w-8 rounded-md text-sm transition-colors",
                    selectable
                      ? "hover:bg-blue-100 cursor-pointer"
                      : "text-gray-300 cursor-not-allowed",
                    isSat && selectable && "bg-blue-50 text-blue-700 font-medium",
                    isSelected && "bg-blue-600 text-white hover:bg-blue-700",
                    !isSat && "text-gray-300"
                  )}
                >
                  {format(date, "d")}
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground text-center">
              📅 Apenas sábados estão disponíveis para agendamento
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
