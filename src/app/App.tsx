import { RouterProvider } from 'react-router';
import { router } from './router/routes';
import { SystemNoticeHost } from '@/shared/components/SystemNoticeModal';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <SystemNoticeHost />
    </>
  );
}
