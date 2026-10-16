import React, {useEffect, useState} from 'react';
import {Alert, Button, Text, View} from 'react-native';
import * as Speech from 'expo-speech';
import * as integration from '@/services/integration';
import {useStudentProfile} from '@/hooks/useStudentProfile';
import {useSavedOpportunities} from '@/hooks/useSavedOpportunities';
import {integrationStrings} from '@/constants/integrationStrings';

export function ReadinessPanel({opportunityId}: {opportunityId: string}) {
  const {profile} = useStudentProfile(), saved = useSavedOpportunities();
  const t = integrationStrings[profile?.preferredLanguage === 'Tamil' ? 'ta' : 'en'];
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function refresh() { setItems(await integration.readChecklist(opportunityId)); }
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await integration.readChecklist(opportunityId);
        const cached = await integration.readEligibility(opportunityId);
        if (mounted) {setItems(data); setResult(cached);}
      } catch {if (mounted) {setItems([]); setResult(null);}}
    };
    void load();
    const timer = setInterval(() => { if (mounted) void load(); }, 1500);
    return () => {mounted = false; clearInterval(timer); void Speech.stop();};
  }, [opportunityId]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <View style={{padding: 16, gap: 12}}>
    <Text style={{fontWeight: '700'}}>{t.checklist}</Text>
    <Button title={t.prepare} disabled={busy} onPress={() => void run(async () => {
      if (!saved.isSaved(opportunityId)) await saved.toggleSave(opportunityId);
      setItems(await integration.prepareChecklist(opportunityId));
    })} />
    <Button title={t.check} disabled={busy} onPress={() => void run(async () => {
      setResult(await integration.eligibility(opportunityId));
    })} />
    {result ? <View>
      <Text>{result.cached ? t.cached : ''} {new Date(result.fetchedAt).toLocaleString()}</Text>
      <Text>{result.value.status}</Text>
      {(result.value.criteria || []).map((criterion: Record<string, string>) =>
        <Text key={criterion.criterion_id}>{criterion.status}: {criterion.explanation}</Text>)}
      {(result.value.missing_information || []).map((field: string) => <Text key={field}>Information needed: {field}</Text>)}
      {(result.value.next_steps || []).map((step: string, i: number) => <Text key={i}>{step}</Text>)}
    </View> : null}
    {items.map(item => <View key={item.id} style={{gap: 8}}>
      <Text>{item.title}</Text>
      {item.description ? <Text>{item.description}</Text> : null}
      <Text>{item.pending ? t.pending : t.saved}</Text>
      <Button title={(item.completed ? '☑ ' : '☐ ') + item.title} disabled={busy || item.conflict}
        onPress={() => void run(async () => {await integration.setChecklistItem(item.id, !item.completed); await refresh();})} />
      {item.conflict ? <Button title={t.review} onPress={() => {
        Alert.alert(t.review, t.discard, [{text: t.cancel, style: 'cancel'},
          {text: t.confirm, onPress: () => void run(async () => {
            await integration.reloadServer('item:' + item.id); await refresh();
          })}]);
      }} /> : null}
    </View>)}
    <Button title={t.play} disabled={busy} onPress={() => void run(async () => {
      const language = profile?.preferredLanguage === 'Tamil' ? 'ta-IN' : 'en-IN';
      const voices = await Speech.getAvailableVoicesAsync();
      const voice = voices.find(v => v.language.split('-')[0] === language.split('-')[0]);
      if (!voice) throw new Error(t.noVoice);
      await Speech.stop();
      const guidance = [...items.map(item => item.title),
        ...(result?.value?.criteria || []).map((c: Record<string, string>) => c.explanation)].join('. ');
      Speech.speak(guidance.slice(0, Math.min(3000, Speech.maxSpeechInputLength)),
        {language, voice: voice.identifier, onError: () => setError(t.unavailable)});
    })} />
    <Button title={t.stop} onPress={() => {void Speech.stop();}} />
    <Text>{t.notApplied}</Text><Text>{t.official}</Text>
    {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
  </View>;
}
