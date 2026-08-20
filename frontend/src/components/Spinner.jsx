/**
 * Spinner — inline loading indicator for buttons and page sections.
 * size: "sm" (16px) | "md" (24px, default) | "lg" (36px)
 */

export default function Spinner({ size = "md" }) {
  const px = size === "sm" ? 16 : size === "lg" ? 36 : 24;
  return (
    <span
      className="spinner"
      style={{ width: px, height: px, borderWidth: size === "sm" ? 2 : 3 }}
      aria-label="Loading"
    />
  );
}
