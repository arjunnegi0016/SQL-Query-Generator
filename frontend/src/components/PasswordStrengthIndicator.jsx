import React from 'react';
import { Check, X } from 'lucide-react';

export default function PasswordStrengthIndicator({ password }) {
  const requirements = [
    { label: 'At least 8 characters', regex: /.{8,}/ },
    { label: 'Contains uppercase letter', regex: /[A-Z]/ },
    { label: 'Contains lowercase letter', regex: /[a-z]/ },
    { label: 'Contains number', regex: /[0-9]/ },
    { label: 'Contains special character', regex: /[^A-Za-z0-9]/ },
  ];

  const strength = requirements.filter((req) => req.regex.test(password)).length;
  
  let strengthLabel = 'Weak';
  let strengthColor = 'bg-red-500';
  let width = 'w-1/3';

  if (strength >= 4) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-green-500';
    width = 'w-full';
  } else if (strength >= 2) {
    strengthLabel = 'Medium';
    strengthColor = 'bg-yellow-500';
    width = 'w-2/3';
  }

  if (password.length === 0) {
    strengthLabel = '';
    strengthColor = 'bg-zinc-700';
    width = 'w-0';
  }

  return (
    <div className="w-full mt-2">
      {/* Visual Bar */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground font-medium">Password strength</span>
        {strengthLabel && (
          <span className={`text-xs font-bold ${strengthColor.replace('bg-', 'text-')}`}>
            {strengthLabel}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex">
        <div className={`h-full ${strengthColor} ${width} transition-all duration-300 ease-in-out`} />
      </div>

      {/* Checklist */}
      <div className="mt-3 space-y-1.5">
        {requirements.map((req, index) => {
          const isMet = req.regex.test(password);
          return (
            <div key={index} className="flex items-center text-xs">
              {isMet ? (
                <Check className="w-3.5 h-3.5 text-green-500 mr-2 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-zinc-600 mr-2 shrink-0" />
              )}
              <span className={isMet ? 'text-zinc-300' : 'text-zinc-500'}>
                {req.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
