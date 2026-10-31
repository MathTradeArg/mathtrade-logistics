import { StaffEmpty, StaffPage } from '@/components/staff';

export default function ReferrerOnly({
  message = 'Solo el referente de la ciudad maneja los envíos.',
}: { message?: string }) {
  return (
    <StaffPage>
      <StaffEmpty>{message}</StaffEmpty>
    </StaffPage>
  );
}
