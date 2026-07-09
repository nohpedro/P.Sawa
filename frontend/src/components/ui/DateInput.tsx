import { useRef } from "react";
import { FiCalendar } from "react-icons/fi";
import Input, { type InputProps } from "./Input";
import Button from "./Button";

type DateInputProps = Omit<InputProps, "type">;

export default function DateInput({ disabled, ...props }: DateInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    const input = inputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (input?.showPicker) input.showPicker();
    else input?.focus();
  };

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <Input {...props} ref={inputRef} type="date" disabled={disabled} />
      <Button type="button" size="sm" variant="outline" onClick={openPicker} disabled={disabled} title="Calendario">
        <FiCalendar size={14} />
      </Button>
    </div>
  );
}
