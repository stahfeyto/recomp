import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type FieldProps = {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** Unidade mostrada dentro do campo, à direita (ex.: "cm", "kg"). */
  unit?: string;
  size?: "md" | "xl";
  id?: string;
  className?: string;
};

/**
 * Campo com label visível, dica e erro debaixo do próprio campo.
 * Para números usa `decimal`: teclado numérico no telemóvel, aceita vírgula ou ponto
 * (lê-se com `parseDecimal` de lib/number.ts).
 */
export function TextField({
  label,
  hint,
  error,
  unit,
  size = "md",
  id,
  className,
  decimal,
  ...input
}: FieldProps & { decimal?: boolean } & Omit<ComponentProps<"input">, "size" | "id">) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  const control = (
    <input
      id={inputId}
      className={cn("input", size === "xl" && "input--xl")}
      aria-invalid={error ? true : undefined}
      aria-describedby={cn(hintId, errorId) || undefined}
      {...(decimal
        ? { type: "text", inputMode: "decimal" as const, autoComplete: "off", pattern: "[0-9]*[.,]?[0-9]*" }
        : {})}
      {...input}
    />
  );

  return (
    <div className={cn("field", className)}>
      <label htmlFor={inputId} className="field__label">
        {label}
      </label>
      {unit ? (
        <div className="input-affix">
          {control}
          <span className="input-affix__unit" aria-hidden="true">
            {unit}
          </span>
        </div>
      ) : (
        control
      )}
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  id,
  className,
  ...textarea
}: Omit<FieldProps, "unit" | "size"> & Omit<ComponentProps<"textarea">, "id">) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className={cn("field", className)}>
      <label htmlFor={inputId} className="field__label">
        {label}
      </label>
      <textarea
        id={inputId}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hintId, errorId) || undefined}
        {...textarea}
      />
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({
  label,
  className,
  ...input
}: { label: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className={cn("check", className)}>
      <input type="checkbox" {...input} />
      <span>{label}</span>
    </label>
  );
}
