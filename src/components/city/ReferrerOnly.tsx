import { StaffEmpty, StaffPage } from '@/components/staff';

export default function ReferrerOnly() {
  return (
    <StaffPage>
      <StaffEmpty>Solo el referente de la ciudad maneja los envíos.</StaffEmpty>
    </StaffPage>
  );
}
