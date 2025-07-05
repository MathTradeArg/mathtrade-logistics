"use client";

import React, { createContext, useState, useContext, ReactNode, useCallback, useRef } from 'react';

interface ActionStatusContextType {
  isProcessingAction: boolean;
  actionError: string | null;
  actionSuccess: string | null;
  setIsProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  clearMessages: () => void;
}

const ActionStatusContext = createContext<ActionStatusContextType | undefined>(undefined);

export const ActionStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  const setIsProcessing = useCallback((isProcessing: boolean) => setIsProcessingAction(isProcessing), []);
  
  const setError = useCallback((error: string | null) => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }
    
    setActionError(error);
    if (error) {
      errorTimerRef.current = setTimeout(() => {
        setActionError(null);
        errorTimerRef.current = null;
      }, 5000);
    }
  }, []);
  
  const setSuccess = useCallback((success: string | null) => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    
    setActionSuccess(success);
    if (success) {
      successTimerRef.current = setTimeout(() => {
        setActionSuccess(null);
        successTimerRef.current = null;
      }, 3000);
    }
  }, []);
  
  const clearMessages = useCallback(() => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    
    setActionError(null);
    setActionSuccess(null);
  }, []);

  return (
    <ActionStatusContext.Provider value={{ isProcessingAction, actionError, actionSuccess, setIsProcessing, setError, setSuccess, clearMessages }}>
      {children}
    </ActionStatusContext.Provider>
  );
};

export const useActionStatus = (): ActionStatusContextType => {
  const context = useContext(ActionStatusContext);
  if (context === undefined) {
    throw new Error('useActionStatus must be used within an ActionStatusProvider');
  }
  return context;
};