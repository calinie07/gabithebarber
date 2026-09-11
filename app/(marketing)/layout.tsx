import { Syne } from "next/font/google";

const landingDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-landing",
  display: "swap",
  weight: ["600", "700", "800"],
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${landingDisplay.variable} min-h-dvh w-full bg-black`}>
      {children}
    </div>
  );
}
