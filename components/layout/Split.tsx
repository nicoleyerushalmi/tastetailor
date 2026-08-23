import type { ReactNode } from "react";

type SplitProps = {
  media: ReactNode;
  children: ReactNode;
  mediaSide?: "left" | "right";
  className?: string;
};

export function Split({
  media,
  children,
  mediaSide = "left",
  className = "",
}: SplitProps) {
  return (
    <div
      className={`grid min-h-0 flex-1 lg:grid-cols-2 ${className}`}
    >
      <div
        className={`relative min-h-[220px] overflow-hidden lg:min-h-full ${
          mediaSide === "right" ? "lg:order-2" : ""
        }`}
      >
        {media}
      </div>
      <div
        className={`flex flex-col justify-center ${
          mediaSide === "right" ? "lg:order-1" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
