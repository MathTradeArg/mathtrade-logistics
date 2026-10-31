import { StaffEmpty, StaffPage } from '@/components/staff';

/** City screens for a user without a city (e.g. an admin who isn't a referrer). */
export default function NoCity() {
  return (
    <StaffPage>
      <StaffEmpty>No tenés una ciudad asignada.</StaffEmpty>
    </StaffPage>
  );
}
