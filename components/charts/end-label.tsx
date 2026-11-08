/**
 * Rótulo do valor no fim de uma linha (só no último ponto da série).
 * O texto usa a cor de texto, nunca a cor da série.
 */
export function EndLabel(props: {
  x?: number | string;
  y?: number | string;
  index?: number;
  value?: unknown;
  lastIndex: number;
  text: (v: number) => string;
}) {
  const { x, y, index, value, lastIndex, text } = props;
  if (index !== lastIndex || typeof value !== "number" || x === undefined || y === undefined) {
    return null;
  }
  return (
    <text
      x={Number(x) + 8}
      y={Number(y)}
      dy={4}
      fill="#DCE6FF"
      fontSize={12}
      fontWeight={600}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {text(value)}
    </text>
  );
}
