import logoUrl from "@/assets/yellow-chicken-logo.svg";

export function Logo({ className = "h-9 w-auto", monochrome = false }: { className?: string; monochrome?: boolean }) {
  return <img src={logoUrl} alt="Yellow Chicken" className={`${className} ${monochrome ? "grayscale contrast-150" : ""}`} />;
}
