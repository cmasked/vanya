import React, {useEffect, useState} from 'react';
import {Alert, Button, ScrollView, Text, TextInput} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router} from 'expo-router';
import {VoiceInput} from '@/components/VoiceInput';
import {useStudentProfile} from '@/hooks/useStudentProfile';
import {integrationStrings} from '@/constants/integrationStrings';
import * as integration from '@/services/integration';

export default function VoiceSyncScreen() {
  const {profile, updateDraftForm} = useStudentProfile();
  const t = integrationStrings[profile?.preferredLanguage === 'Tamil' ? 'ta' : 'en'];
  const [token, setToken] = useState(''), [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof integration.getStatus>> | null>(null);
  useEffect(() => {
    let mounted = true;
    const refresh = () => {void integration.getStatus().then(value => {
      if (mounted) setStatus(value);
    }).catch(() => {if (mounted) setError('Local data needs recovery.');});};
    refresh(); const timer = setInterval(refresh, 1500);
    return () => {mounted = false; clearInterval(timer);};
  }, []);
  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError('');
    try {await action(); setStatus(await integration.getStatus());}
    catch (e) {setError(e instanceof Error ? e.message : 'Please try again.');}
    finally {setBusy(false);}
  }
  return <SafeAreaView style={{flex: 1}}>
    <ScrollView contentContainerStyle={{padding: 20, gap: 14}} keyboardShouldPersistTaps="handled">
      <Button title={t.close} onPress={() => router.back()} />
      <Text style={{fontSize: 24}}>{t.settings}</Text>
      <Text>{status?.network}</Text>
      <Text>{t.pending}: {status?.state?.queue.length || 0}</Text>
      <Text>{status?.state?.lastSync ? new Date(status.state.lastSync).toLocaleString() : ''}</Text>
      <TextInput accessibilityLabel={t.token} placeholder={t.token} value={token} onChangeText={setToken}
        secureTextEntry autoCapitalize="none" autoCorrect={false} style={{borderWidth: 1, padding: 12}} />
      <Button title={t.connect} disabled={busy || !token.trim()} onPress={() => void run(async () => {
        await integration.connect(token); setToken('');
      })} />
      <Button title={t.syncProfile} disabled={busy || !profile || !status?.connected}
        onPress={() => void run(() => integration.syncProfile(profile!, true))} />
      <Button title={t.retry} disabled={busy || !status?.connected} onPress={() => void run(integration.retry)} />
      <Button title={t.disconnect} disabled={busy || !status?.connected} onPress={() => void run(integration.disconnect)} />
      {status?.state?.error ? <Text accessibilityLiveRegion="polite">{status.state.error === 'auth' ? t.connect : t.review}</Text> : null}
      {(status?.state?.queue || []).filter(op => op.status === 'conflict' || op.status === 'failed').map(op =>
        <Button key={op.id} title={t.review + ': ' + (status?.state?.records[op.entity]?.value.title || t.checklist)} onPress={() => {
          // Discarding a local intent always requires an explicit choice.
          Alert.alert(t.review, t.discard, [
            {text: t.cancel, style: 'cancel'},
            {text: t.confirm, onPress: () => void run(() => integration.reloadServer(op.entity))}]);
        }} />)}
      <Text>{t.voiceName}</Text>
      <VoiceInput preferredLanguage={profile?.preferredLanguage} onAccept={text => {
        updateDraftForm({displayName: text}); router.push('/onboarding');
      }} />
      {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}
