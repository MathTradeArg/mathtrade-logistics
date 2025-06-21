"use client";

import { useAuth } from "@/hooks/useAuth";
import { useControlPanel } from "@/contexts/ControlPanelContext";
import ControlPanelModal from "@/components/ControlPanel/ControlPanelModal";

export const GlobalControlPanel = () => {
  const { isPanelOpen, closePanel } = useControlPanel();
  const { isAdmin } = useAuth();

  return (
    <ControlPanelModal
      isOpen={isPanelOpen}
      onClose={closePanel}
      isAdmin={!!isAdmin} 
       />
  );
};

