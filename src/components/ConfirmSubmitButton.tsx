"use client";

import React from 'react';

export function ConfirmSubmitButton({
  children,
  className = '',
  message = 'Bu işlemi onaylıyor musunuz?',
  title,
}: {
  children: React.ReactNode;
  className?: string;
  message?: string;
  title?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      title={title}
      aria-label={title}
      onClick={(e) => {
        // Prevent submit if user cancels
        if (!window.confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
