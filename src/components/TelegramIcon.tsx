// Значок Telegram (бумажный самолётик); цвет — currentColor.
export function TelegramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M9.78 15.17 9.6 19.4c.4 0 .57-.17.78-.38l1.87-1.8 3.88 2.84c.71.4 1.22.19 1.41-.65l2.55-11.96c.23-1.05-.38-1.46-1.07-1.2L3.03 11.97c-1.03.4-1.01.97-.18 1.23l3.84 1.2 8.92-5.6c.42-.28.8-.12.49.17" />
    </svg>
  );
}
