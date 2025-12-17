export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
}

export default function Skeleton({ width = "100%", height = 12, radius = 6 }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: "#1a2030",
        opacity: 0.9,
      }}
    />
  );
}
