import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { ChatProvider } from '@/lib/chat-context';

export default function ChatLayout() {
  return (
    <ChatProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen 
          name="conversation/[id]" 
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen 
          name="settings" 
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </ChatProvider>
  );
}
