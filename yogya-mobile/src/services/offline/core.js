function createOfflineStore(storage, key, uuid, now = Date.now) {
  let serial = Promise.resolve(), running;
  const blank = () => ({schema: 1, records: {}, queue: [], lastSync: null, error: null});
  const read = async () => {
    const raw = await storage.getItem(key);
    const state = raw === null ? blank() : JSON.parse(raw);
    if (state.schema !== 1 || !Array.isArray(state.queue) || !state.records)
      throw new Error('Local data needs recovery. It has not been discarded.');
    return state;
  };
  const edit = fn => {
    const job = serial.then(async () => {
      const state = await read(), result = fn(state);
      await storage.setItem(key, JSON.stringify(state));
      return result;
    });
    serial = job.then(() => undefined, () => undefined);
    return job;
  };
  const snapshot = () => serial.then(read);
  const cache = (entity, value) => edit(s => {
    const old = s.records[entity];
    if (s.queue.some(o => o.entity === entity)) {
      if (old) old.remote = value;
    } else s.records[entity] = {value, version: value.version ?? 0, fetchedAt: now()};
  });
  const enqueue = (entity, patch, request) => edit(s => {
    const record = s.records[entity];
    if (!record || !Number.isInteger(record.version) || record.version < 0)
      throw new Error('Load this record online before editing it.');
    if (s.queue.length >= 1000) throw new Error('Sync pending changes before adding more.');
    const predecessors = s.queue.filter(o => o.entity === entity);
    const id = uuid();
    s.queue.push({id, entity, patch, ...request,
      body: {...request.body, expected_version: record.version + predecessors.length},
      status: 'pending', attempts: 0, nextAt: 0});
    record.value = {...record.value, ...patch};
    return record.value;
  });
  const flush = send => {
    if (running) return running;
    running = (async () => {
      for (;;) {
        const state = await snapshot();
        const operation = state.queue.find((o, i) => o.status === 'pending' &&
          o.nextAt <= now() && !state.queue.slice(0, i).some(p => p.entity === o.entity));
        if (!operation) return;
        await edit(s => {
          const o = s.queue.find(o => o.id === operation.id);
          o.attempts++;
          o.nextAt = now() + Math.min(60000, 1000 * 2 ** o.attempts);
        });
        try {
          const result = await send(operation);
          if (!Number.isInteger(result.version) || result.version < 1)
            throw Object.assign(new Error('Invalid server response'), {status: 502});
          await edit(s => {
            s.queue = s.queue.filter(o => o.id !== operation.id);
            const record = s.records[operation.entity];
            const newer = s.queue.some(o => o.entity === operation.entity);
            record.version = result.version;
            record.value = newer ? {...record.value, version: result.version} : result;
            record.fetchedAt = now();
            s.lastSync = now(); s.error = null;
          });
        } catch (error) {
          const status = Number(error.status ?? 0);
          await edit(s => {
            const o = s.queue.find(o => o.id === operation.id);
            if (status === 401 || status === 403) {
              o.attempts--; s.error = 'auth';
            } else if (status === 409) { o.status = 'conflict'; s.error = 'conflict'; }
            else if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
              o.status = 'failed'; s.error = 'validation';
            } else {
              o.status = o.attempts >= 6 ? 'stalled' : 'pending';
              s.error = 'unreachable';
            }
          });
          if (status === 401 || status === 403 || status === 0 || status >= 500) return;
        }
      }
    })().finally(() => { running = undefined; });
    return running;
  };
  const retry = () => edit(s => {
    for (const o of s.queue) if (o.status === 'stalled' || o.status === 'pending') {
      o.status = 'pending'; o.attempts = 0; o.nextAt = 0;
    }
  });
  const useServer = (entity, value) => {
    if (running) return Promise.reject(new Error('Wait for synchronization to finish.'));
    return edit(s => {
      s.queue = s.queue.filter(o => o.entity !== entity);
      s.records[entity] = {value, version: value.version, fetchedAt: now()};
      s.error = null;
    });
  };
  return {snapshot, cache, enqueue, flush, retry, useServer};
}

module.exports = {createOfflineStore};
