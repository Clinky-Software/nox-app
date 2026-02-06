import { Redirect } from 'expo-router';

export default function Index() {
  // This will be handled by the layout's auth check
  // Just redirect to auth for initial load
  return <Redirect href="/(auth)/login" />;
}
