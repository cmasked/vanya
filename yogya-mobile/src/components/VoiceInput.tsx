import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, Button, Text, TextInput, View} from 'react-native';
import {AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder} from 'expo-audio';
import * as Speech from 'expo-speech';
import {backendVoice, removeRecording, type VoiceProvider} from '@/services/voice';
import {integrationStrings} from '@/constants/integrationStrings';

export function VoiceInput({onAccept, preferredLanguage, provider = backendVoice}: {
  onAccept(text: string): void; preferredLanguage?: string; provider?: VoiceProvider;
}) {
  const [language, setLanguage] = useState(preferredLanguage === 'Tamil' ? 'ta-IN' : 'en-IN');
  const t = integrationStrings[language === 'ta-IN' ? 'ta' : 'en'];
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<'idle' | 'recording' | 'loading'>('idle');
  const [text, setText] = useState(''), [error, setError] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const busy = useRef(false), generation = useRef(0), speechGeneration = useRef(0);
  const mounted = useRef(true), controller = useRef<AbortController | null>(null);
  const serial = useRef<Promise<unknown>>(Promise.resolve());
  const exclusive = useCallback((action: () => Promise<void>) => {
    const job = serial.current.then(action);
    serial.current = job.catch(() => {});
    return job;
  }, []);
  const cancel = useCallback(async () => {
    const ticket = ++generation.current; speechGeneration.current++;
    controller.current?.abort(); busy.current = true;
    await exclusive(async () => {
      await recorder.stop().catch(() => {});
      removeRecording(recorder.uri);
      await setAudioModeAsync({allowsRecording: false}).catch(() => {});
      await Speech.stop().catch(() => {});
    });
    if (ticket === generation.current) {
      busy.current = false;
      if (mounted.current) { setPhase('idle'); setSpeaking(false); }
    }
  }, [recorder, exclusive]);
  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') void cancel();
    });
    return () => { mounted.current = false; listener.remove(); void cancel(); };
  }, [cancel]);

  async function start() {
    if (busy.current || phase !== 'idle') return;
    busy.current = true; setError(''); setPhase('loading');
    const ticket = ++generation.current;
    controller.current = new AbortController();
    try {
      await exclusive(async () => {
      const capabilities = await provider.capabilities(controller.current!.signal);
      if (!capabilities.configured || !capabilities.languages.includes(language)) throw new Error();
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) { if (mounted.current) setError(t.denied); throw new Error(); }
      if (ticket !== generation.current) return;
      await Speech.stop(); await setAudioModeAsync({allowsRecording: true, playsInSilentMode: true});
      await recorder.prepareToRecordAsync();
      if (ticket !== generation.current) { await recorder.stop().catch(() => {}); return; }
      recorder.record();
      if (mounted.current) setPhase('recording');
      });
    } catch {
      if (ticket === generation.current) await setAudioModeAsync({allowsRecording: false}).catch(() => {});
      if (mounted.current && ticket === generation.current) {
        setError(previous => previous || t.unavailable); setPhase('idle');
      }
    } finally { if (ticket === generation.current) busy.current = false; }
  }
  async function stop() {
    if (busy.current || phase !== 'recording') return;
    busy.current = true; setPhase('loading');
    const ticket = generation.current;
    controller.current = new AbortController();
    let uri: string | null = null;
    try {
      await exclusive(async () => {
      await recorder.stop();
      await setAudioModeAsync({allowsRecording: false});
      uri = recorder.uri;
      if (!uri) throw new Error();
      const transcript = await provider.transcribe(uri, language, controller.current!.signal);
      if (mounted.current && ticket === generation.current) setText(transcript);
      });
    } catch {
      if (mounted.current && ticket === generation.current) setError(t.unavailable);
    } finally {
      removeRecording(uri);
      if (ticket === generation.current) busy.current = false;
      if (mounted.current && ticket === generation.current) setPhase('idle');
    }
  }
  const stopRef = useRef(stop); stopRef.current = stop;
  useEffect(() => {
    if (phase !== 'recording') return;
    const timeout = setTimeout(() => { void stopRef.current(); }, 30000);
    return () => clearTimeout(timeout);
  }, [phase]);
  async function speak() {
    const ticket = ++speechGeneration.current;
    setSpeaking(true); setError('');
    try {
      await Speech.stop();
      const voices = await Speech.getAvailableVoicesAsync();
      const voice = voices.find(v => v.language.split('-')[0] === language.split('-')[0]);
      if (!voice) throw new Error();
      if (ticket !== speechGeneration.current) return;
      const done = () => { if (mounted.current && ticket === speechGeneration.current) setSpeaking(false); };
      Speech.speak(text.slice(0, Math.min(3000, Speech.maxSpeechInputLength)), {
        language, voice: voice.identifier, onDone: done, onStopped: done,
        onError: () => { done(); if (mounted.current && ticket === speechGeneration.current) setError(t.unavailable); }});
    } catch { if (mounted.current) { setSpeaking(false); setError(t.noVoice); } }
  }
  return <View style={{gap: 10, padding: 12}}>
    <View style={{flexDirection: 'row', gap: 8}}>
      <Button title="English" disabled={phase !== 'idle'} onPress={() => setLanguage('en-IN')} />
      <Button title="தமிழ்" disabled={phase !== 'idle'} onPress={() => setLanguage('ta-IN')} />
    </View>
    <Text accessibilityLiveRegion="polite">{phase === 'recording' ? t.recording : phase === 'loading' ? t.loading : ''}</Text>
    <Button title={phase === 'recording' ? t.stop : t.record} disabled={phase === 'loading'}
      onPress={() => { void (phase === 'recording' ? stop() : start()); }} />
    <Button title={t.cancel} onPress={() => { void cancel(); }} />
    {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
    <Text>{t.edit}</Text>
    <TextInput value={text} onChangeText={setText} multiline maxLength={1000}
      accessibilityLabel={t.edit} style={{borderWidth: 1, padding: 12, minHeight: 70}} />
    <Button title={t.apply} disabled={!text.trim() || phase !== 'idle'} onPress={() => onAccept(text.trim())} />
    <Button title={speaking ? t.stop : t.play} disabled={!text.trim() || phase !== 'idle'}
      onPress={() => { if (speaking) {speechGeneration.current++; void Speech.stop(); setSpeaking(false);}
        else void speak(); }} />
  </View>;
}
