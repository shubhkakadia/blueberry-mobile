import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View, type TextInputInstance } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { riseIn } from '@/components/ui/motion';
import { Icons } from '@/constants/icons';
import { climateTint, getClimateTheme, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

export default function SignInScreen() {
  const { bridge, notice, signIn } = useAuth();
  const theme = useTheme();
  const tint = climateTint(getClimateTheme('cool'), useColorScheme() === 'dark' ? 'dark' : 'light');
  const [address, setAddress] = useState(bridge ?? '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(notice);
  const [busy, setBusy] = useState(false);
  const usernameRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const incomplete = !address.trim() || !username.trim() || !password;

  const submit = async () => {
    if (busy || incomplete) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(address, username, password);
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
            <View style={styles.intro}>
              <View style={[styles.mark, { backgroundColor: tint.deep }]}>
                <SymbolView name={Icons.cool} size={28} tintColor={theme.surface} />
              </View>
              <View style={styles.introText}>
                <ThemedText accessibilityRole="header" style={styles.title}>
                  Bridge
                </ThemedText>
                <ThemedText themeColor="fgBody" style={styles.lede}>
                  The aircon, the timers, the shopping and dinner — for everyone at home.
                </ThemedText>
              </View>
            </View>

            <Animated.View
              entering={riseIn}
              style={[styles.form, { backgroundColor: theme.surface, boxShadow: theme.shadowE2 }]}>
              <ThemedText type="display">Sign in</ThemedText>

              <Field label="Bridge address" hint="Like 192.168.1.20:8080, or its Tailscale https:// address.">
                {(a11y) => (
                  <Input
                    {...a11y}
                    value={address}
                    onChangeText={setAddress}
                    keyboardType="url"
                    textContentType="URL"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => usernameRef.current?.focus()}
                  />
                )}
              </Field>

              <Field label="Username">
                {(a11y) => (
                  <Input
                    {...a11y}
                    ref={usernameRef}
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
  mark: { width: 56, height: 56, borderRadius: Radius.row, alignItems: 'center', justifyContent: 'center' },
  introText: { gap: 8 },
  title: { fontSize: 40, lineHeight: 42, fontWeight: '600', letterSpacing: -1.2 },
  lede: { fontSize: 17, lineHeight: 25, maxWidth: 300 },
  form: { borderRadius: Radius.sheet, padding: 24, gap: 18 },
  submit: { marginTop: 4 },
  footer: { marginTop: 'auto', textAlign: 'center' },
});
