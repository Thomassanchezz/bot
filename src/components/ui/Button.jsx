import React from 'react';

const Button = ({ children, variant = 'primary', className = '', disabled = false, ...props }) => {
  const base = 'inline-flex items-center justify-center rounded-lg font-semibold transition-transform duration-150 ease-out transform-gpu will-change-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 gap-2';
  const disabledClass = disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : '';
  const variants = {
    primary: `bg-primary text-white hover:scale-[1.02] active:translate-y-0.5 px-4 py-2 ${disabledClass}`,
    ghost: `bg-white/5 text-white hover:bg-white/10 hover:scale-[1.01] px-4 py-2 ${disabledClass}`,
    outline: `border border-white/10 text-white hover:scale-[1.01] px-4 py-2 ${disabledClass}`
  };
  const classes = `${base} ${variants[variant] || variants.primary} ${className}`;

  return (
    <button className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  );
};

export default Button;
