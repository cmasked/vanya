import React, {useEffect, useState} from 'react';
import {Text} from 'react-native';
import {getStatus, startSync} from '@/services/integration';

export function SyncBridge() {
  const [label, setLabel] = useState('');
  useEffect(() => {
    let mounted = true;
    const stop = startSync();
    const timer = setInterval(() => {
      void getStatus().then(status => {
        if (mounted) setLabel(status.connected
          ? status.network + ' · ' + (status.state?.queue.length || 0) + ' changes pending sync' : '');
      }).catch(() => { if (mounted) setLabel('Local data needs recovery.'); });
    }, 1500);
    return () => {mounted = false; clearInterval(timer); stop();};
  }, []);
  return label ? <Text accessibilityLiveRegion="polite" style={{padding: 8}}>{label}</Text> : null;
}
