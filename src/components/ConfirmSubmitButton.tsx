"use client";

// Кнопка submit с подтверждением перед отправкой формы — для необратимых
// на вид действий (отмена записи и т.п.). Сама форма/server action не
// меняется, это только клиентская защита от случайного клика.
export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
  name,
  value,
}: {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
  // Имя и значение кнопки уходят вместе с формой (одна форма — несколько
  // действий).
  name?: string;
  value?: string;
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
