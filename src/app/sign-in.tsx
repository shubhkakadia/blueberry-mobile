import { useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, ScrollView, StyleSheet, View, type TextInputInstance } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { riseInAt } from '@/components/ui/motion';
import { climateTint, getClimateTheme, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

export default function SignInScreen() {
  const { notice, signIn } = useAuth();
  const theme = useTheme();
  const tint = climateTint(getClimateTheme('cool'), useColorScheme() === 'dark' ? 'dark' : 'light');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(notice);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);
  const incomplete = !username.trim() || !password;

  const submit = async () => {
    if (busy || incomplete) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(username, password);
    } catch (e) {
      setError((e as Error).message);
      // The field is uncontrolled, so clear it natively too.
      setPassword('');
      passwordRef.current?.clear();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.page, { backgroundColor: tint.page }]}>
      {/* The set point the home screen opens on, as a watermark. */}
      <ThemedText
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.watermark, { color: tint.deep }]}>
        23°
      </ThemedText>

      {/* `padding` on Android too: edge-to-edge windows don't resize for the keyboard, so without
          it the password field and Sign in sit under the keyboard. */}
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <SafeAreaView style={styles.fill}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Animated.View entering={riseInAt(0)} style={styles.intro}>
              {/* The app icon itself; its tile is the page's own tint, so a shadow draws the edge. */}
              <Image
                source={require('@/assets/images/blueberry-icon.png')}
                accessibilityIgnoresInvertColors
                style={[styles.mark, { boxShadow: theme.shadowE2 }]}
              />
              <View style={styles.introText}>
                <ThemedText accessibilityRole="header" style={styles.title}>
                  Blueberry
                </ThemedText>
                <ThemedText themeColor="fgBody" style={styles.lede}>
                  The aircon, the timers, the shopping and dinner — for everyone at home.
                </ThemedText>
              </View>
            </Animated.View>

            <Animated.View
              entering={riseInAt(1)}
              style={[styles.form, { backgroundColor: theme.surface, boxShadow: theme.shadowE2 }]}>
              <ThemedText type="display">Sign in</ThemedText>

              <Field label="Username">
                {(a11y) => (
                  <Input
                    {...a11y}
                    value={username}
                    onChangeText={setUsername}
                    autoComplete="username"
                    textContentType="username"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                )}
              </Field>

              <Field label="Password">
                {/* Uncontrolled: on Android, echoing `value` back into a secure field swapped
                    fast keystrokes, so the wrong password was sent. */}
                {(a11y) => (
                  <Input
                    {...a11y}
                    ref={passwordRef}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={submit}
                  />
                )}
              </Field>

              {error && <Alert tone="danger">{error}</Alert>}

              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={busy}
                loadingLabel="Signing in…"
                disabled={incomplete}
                onPress={submit}
                style={styles.submit}>
                Sign in
              </Button>
            </Animated.View>

            <ThemedText type="meta" themeColor="fgMuted" style={styles.footer}>
              No account? Ask whoever runs the bridge to add you — there’s no sign-up here.
            </ThemedText>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  fill: { flex: 1 },
  watermark: {
    position: 'absolute',
    right: -36,
    top: 40,
    fontSize: 220,
    lineHeight: 220,
    fontWeight: '200',
    letterSpacing: -9.9,
    opacity: 0.07,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: 40,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  intro: { gap: 20 },
  mark: { width: 56, height: 56, borderRadius: Radius.row },
  introText: { gap: 8 },
  title: { fontSize: 40, lineHeight: 42, fontWeight: '600', letterSpacing: -1.2 },
  lede: { fontSize: 17, lineHeight: 25, maxWidth: 300 },
  form: { borderRadius: Radius.sheet, padding: 24, gap: 18 },
  submit: { marginTop: 4 },
  footer: { marginTop: 'auto', textAlign: 'center' },
});
