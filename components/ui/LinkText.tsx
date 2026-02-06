/**
 * LinkText Component
 * Renders text with clickable links that open in the device browser
 */

import React, { useMemo, useCallback } from 'react';
import { Text, Linking, StyleSheet, TextStyle, Alert } from 'react-native';
import { Colors } from '@/constants/theme';

interface LinkTextProps {
  children: string;
  style?: TextStyle;
  linkStyle?: TextStyle;
}

// URL regex pattern - matches http, https, and www URLs
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"\[\]{}|\\^`]+/gi;

// Parse text into segments of plain text and links
const parseText = (text: string): Array<{ type: 'text' | 'link'; content: string }> => {
  const segments: Array<{ type: 'text' | 'link'; content: string }> = [];
  let lastIndex = 0;

  // Reset regex state
  URL_REGEX.lastIndex = 0;

  let match;
  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }

    // Add the link
    segments.push({
      type: 'link',
      content: match[0],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last link
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  return segments;
};

export const LinkText: React.FC<LinkTextProps> = ({ children, style, linkStyle }) => {
  const segments = useMemo(() => parseText(children), [children]);

  const handleLinkPress = useCallback(async (url: string) => {
    try {
      // Add https:// prefix if missing (for www. links)
      let fullUrl = url;
      if (url.startsWith('www.')) {
        fullUrl = `https://${url}`;
      }

      const canOpen = await Linking.canOpenURL(fullUrl);
      if (canOpen) {
        await Linking.openURL(fullUrl);
      } else {
        Alert.alert('Cannot open link', 'Unable to open this URL');
      }
    } catch (error) {
      console.error('Failed to open link:', error);
      Alert.alert('Error', 'Failed to open the link');
    }
  }, []);

  // If no links found, just render plain text
  if (segments.length === 1 && segments[0].type === 'text') {
    return <Text style={style}>{children}</Text>;
  }

  return (
    <Text style={style}>
      {segments.map((segment, index) => {
        if (segment.type === 'link') {
          return (
            <Text
              key={index}
              style={[styles.link, linkStyle]}
              onPress={() => handleLinkPress(segment.content)}
            >
              {segment.content}
            </Text>
          );
        }
        return <Text key={index}>{segment.content}</Text>;
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});

export default LinkText;
