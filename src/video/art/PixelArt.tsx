import React from "react";

export type Sprite = {
  rows: string[];
  palette: Record<string, string>;
};

export const PixelArt: React.FC<{
  sprite: Sprite;
  scale: number;
  style?: React.CSSProperties;
  className?: string;
}> = ({ sprite, scale, style, className }) => {
  const width = Math.max(...sprite.rows.map((row) => row.length));

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${width}, ${scale}px)`,
        gridAutoRows: `${scale}px`,
        width: width * scale,
        height: sprite.rows.length * scale,
        imageRendering: "pixelated",
        ...style,
      }}
    >
      {sprite.rows.flatMap((row, rowIndex) => {
        const padded = row.padEnd(width, ".");
        return padded.split("").map((char, columnIndex) => (
          <div
            key={`${rowIndex}-${columnIndex}`}
            style={{ background: sprite.palette[char] ?? "transparent" }}
          />
        ));
      })}
    </div>
  );
};
