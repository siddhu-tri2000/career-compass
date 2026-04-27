const widthMap = {
  narrow: "max-w-4xl",
  default: "max-w-5xl",
  wide: "max-w-6xl",
} as const;

interface ContentContainerProps {
  children: React.ReactNode;
  width?: keyof typeof widthMap;
  className?: string;
  as?: "main" | "div" | "section";
}

export default function ContentContainer({
  children,
  width = "default",
  className = "",
  as: Tag = "main",
}: ContentContainerProps) {
  return (
    <Tag
      className={`mx-auto ${widthMap[width]} px-4 py-10 sm:px-6 ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
