"use client";

import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import type { Box } from '@/types/logistics';
import { useCallback, useState } from 'react';

export const useCreatedBoxes = () => {
  const { isAuthenticated } = useAuth();
  const { data: createdBoxes, isLoading: isLoadingCreated, error: errorCreated, execute: fetchCreatedBoxesApi } = useApi<Box[]>('logistics/boxes');

  const fetchCreatedBoxes = useCallback(async () => {
    try {
      const data = await fetchCreatedBoxesApi();
    } catch (err) {
      console.error("Error fetching created boxes:", err);
    }
  }, [fetchCreatedBoxesApi]);

  return {
    createdBoxes: createdBoxes || [], 
    isLoadingCreated,
    errorCreated,
    fetchCreatedBoxes
  };
};
