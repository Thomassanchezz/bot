import React from 'react';

const FormField = ({ id, label, type = 'text', placeholder, value, onChange, options = [], help, error, step, className = '', inputClassName = '', required = false }) => {
  const inputId = id || `field-${label ? label.replace(/\s+/g, '').toLowerCase() : Math.random().toString(36).slice(2, 8)}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  return (
    <div className={`mb-2 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm text-blue-200 mb-1 block">
          {label}{required && <span className="ml-1 text-red-400">*</span>}
        </label>
      )}

      {type === 'select' ? (
        <select
          id={inputId}
          value={value}
          onChange={onChange}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={help ? helpId : error ? errorId : undefined}
          className={`w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400 ${inputClassName}`}
        >
          {options.map((opt) => (
            <option key={opt.value || opt} value={opt.value || opt} className="text-black">
              {opt.label || opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          step={step}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={help ? helpId : error ? errorId : undefined}
          className={`w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 ${inputClassName}`}
        />
      )}

      {help && <p id={helpId} className="text-xs text-gray-400 mt-1">{help}</p>}
      {error && <p id={errorId} className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
};

export default FormField;
