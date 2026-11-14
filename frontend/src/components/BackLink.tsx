import { ArrowLeft } from "lucide-react";

export default function BackLink({
  to = "/explore",
  children = "Back",
}: {
  to?: string;
  children?: string;
}) {
  return (
    <a className="back" href={"#" + to}>
      <ArrowLeft size={14} /> {children}
    </a>
  );
}
