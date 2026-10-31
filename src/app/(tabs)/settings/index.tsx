import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ComingSoon } from '@/components/coming-soon';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icons } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';
import { useAuth, useUser } from '@/lib/auth';

export default function SettingsScreen() {
  const user = useUser();
  const { signOut } = useAuth();
  const theme = useTheme();
  const [leaving, setLeaving] = useState(false);
  const displayName = user.username.charAt(0).toUpperCase() + user.username.slice(1);

  return (
    <ComingSoon
      sections={[
        ['General', 'M3'],
        ['Energy plan', 'M8'],
      ]}>
      <ThemedText type="eyebrow" themeColor="fgMuted" accessibilityRole="header" style={styles.eyebrow}>
        Account
      </ThemedText>
      <Card padding="list">
        <View style={styles.account}>
          <View style={[styles.avatar, { backgroundColor: theme.accentDeep }]}>
            <ThemedText style={[styles.initial, { color: theme.surface }]}>{displayName.charAt(0)}</ThemedText>
          </View>
          <View style={styles.who}>
            <ThemedText numberOfLines={1} style={styles.name}>
              {displayName}
            </ThemedText>
            <ThemedText type="meta" themeColor="fgMuted" numberOfLines={1}>
              Signed in as {user.username}
            </ThemedText>
          </View>
        </View>
      </Card>
      <Button
        variant="danger"
        size="lg"
        fullWidth
        icon={Icons.signOut}
        loading={leaving}
        loadingLabel="Signing out…"
        onPress={() => {
          setLeaving(true);
          void signOut();
        }}
        style={styles.signOut}>
        Sign out
      </Button>
    </ComingSoon>
  );
}

const styles = StyleSheet.create({
  eyebrow: { paddingHorizontal: 4 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 18, fontWeight: '600' },
  who: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontWeight: '600' },
  signOut: { marginTop: 8, marginBottom: 12 },
});
