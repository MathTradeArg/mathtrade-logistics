import BoxManagementSection from "@/components/boxes/BoxManagementSection";
import type { Box } from '@/types';
import React from 'react';

interface CreatedBoxesSectionProps {
  createdBoxes: Box[];
  isLoadingCreated: boolean;
  errorCreated: string | null;
}

const CreatedBoxesSection: React.FC<CreatedBoxesSectionProps> = ({
  createdBoxes,
  isLoadingCreated,
  errorCreated,
}) => {
  return <BoxManagementSection hideCreateButton={true} hideTitle={true} />;
};

export default CreatedBoxesSection;
