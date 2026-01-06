import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
}

export function Button({ children, className, variant = "primary", ...props }: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-bold";
  
  const variants = {
    primary: "bg-[#107c10] text-white hover:bg-[#169d16] shadow-sm",
    outline: "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}