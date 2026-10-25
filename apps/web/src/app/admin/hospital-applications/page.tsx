import { redirect } from 'next/navigation';

export default function HospitalApplicationsRedirect() {
  redirect('/admin/hospitals?tab=pending');
}
