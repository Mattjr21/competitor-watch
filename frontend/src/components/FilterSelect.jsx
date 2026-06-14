import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export default function FilterSelect({
  id,
  "aria-label": ariaLabel,
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  disabled,
}) {
  const selectValue = value || ALL;

  return (
    <Select
      value={selectValue}
      onValueChange={(next) => onChange(next === ALL ? "" : next)}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn("h-11 w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value || ALL} value={opt.value || ALL}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
