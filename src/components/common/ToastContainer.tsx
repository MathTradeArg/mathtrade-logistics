"use client";

import { useActionStatus } from '@/contexts/ActionStatusContext';
import Toast from './Toast';

export default function ToastContainer() {
  const { actionSuccess, actionError, clearMessages } = useActionStatus();

  return (
    <>
      {actionSuccess && (
        <Toast
          message={actionSuccess}
          type="success"
          onClose={clearMessages}
          duration={3000}
        />
      )}
      {actionError && (
        <Toast
          message={actionError}
          type="error"
          onClose={clearMessages}
          duration={5000}
        />
      )}
    </>
  );
}
