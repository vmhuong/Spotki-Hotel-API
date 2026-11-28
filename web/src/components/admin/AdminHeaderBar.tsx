import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const AdminHeaderBar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById('admin-header-controls'));
  }, []);

  if (!target) return null;
  return createPortal(children, target);
};
