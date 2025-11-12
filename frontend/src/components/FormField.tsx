import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { FieldError } from "./ErrorMessage";

type BaseProps = {
  label: string;
  id: string;
  error?: string;
  required?: boolean;
  className?: string;
};

type InputProps = BaseProps & {
  type: "text" | "email" | "password" | "number";
  as?: "input";
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type" | "className">;

type TextareaProps = BaseProps & {
  as: "textarea";
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className">;

type SelectProps = BaseProps & {
  as: "select";
  options: Array<{ value: string | number; label: string }>;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "className">;

type FormFieldProps = InputProps | TextareaProps | SelectProps;

/**
 * Campo de formulário reutilizável seguindo BEM
 * Reduz duplicação em formulários
 */
export default function FormField(props: FormFieldProps) {
  const {
    label,
    id,
    error,
    required = false,
    className = "",
    as = "input",
    ...rest
  } = props;

  const baseClassName = `form-field ${className}`;
  const labelClassName = "form-field__label";
  const inputClassName = "form-field__input";

  const renderInput = () => {
    if (as === "textarea") {
      const textareaProps = rest as Omit<
        TextareaHTMLAttributes<HTMLTextAreaElement>,
        "id" | "className"
      >;
      return (
        <textarea
          id={id}
          className={inputClassName}
          required={required}
          {...textareaProps}
        />
      );
    }

    if (as === "select") {
      const { options, ...selectRest } = props as SelectProps;
      return (
        <select
          id={id}
          className={inputClassName}
          required={required}
          {...selectRest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    const inputProps = rest as Omit<
      InputHTMLAttributes<HTMLInputElement>,
      "id" | "className"
    >;
    const inputType = (props as InputProps).type || "text";
    return (
      <input
        id={id}
        type={inputType}
        className={inputClassName}
        required={required}
        {...inputProps}
      />
    );
  };

  return (
    <div className={baseClassName}>
      <label htmlFor={id} className={labelClassName}>
        {label}
        {required && <span className="form-field__required"> *</span>}
      </label>
      {renderInput()}
      <FieldError error={error} />
    </div>
  );
}
