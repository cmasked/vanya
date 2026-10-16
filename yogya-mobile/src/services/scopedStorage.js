// Local UI records follow the same account/server boundary as the mutation queue.
function createScopedStorage(storage) {
  let scope = 'guest', serial = Promise.resolve();
  const listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  const key = (kind, owner = scope) => owner === 'guest'
    ? (kind === 'profile' ? '@yogya_student_profile_v1' : '@yogya_saved_opportunities_v1')
    : '@yogya.ui.' + owner + '.' + kind;
  const write = (kind, value) => {
    const owner = scope, target = key(kind, owner);
    const job = serial.then(async () => {
      if (value === null) await storage.removeItem(target);
      else await storage.setItem(target, JSON.stringify(value));
      if (scope === owner) notify();
    });
    serial = job.catch(() => {});
    return job;
  };
  const read = async (kind, valid, fallback) => {
    const owner = scope, target = key(kind, owner);
    await serial;
    const raw = await storage.getItem(target);
    if (scope !== owner) throw new Error('Account changed. Please reopen this screen.');
    if (raw === null) return fallback;
    let value;
    try { value = JSON.parse(raw); } catch {
      throw new Error('Saved data needs recovery. The original has been preserved.');
    }
    if (!valid(value)) throw new Error('Saved data needs recovery. The original has been preserved.');
    return value;
  };
  return {
    getScope: () => scope,
    setScope(next) { if (next !== scope) { scope = next; notify(); } },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    saveProfile: profile => write('profile', profile),
    getProfile: () => read('profile', p => p && typeof p.id === 'string' &&
      typeof p.displayName === 'string' && typeof p.educationLevel === 'string' &&
      typeof p.state === 'string' && Array.isArray(p.interests), null),
    clearProfile: () => write('profile', null),
    saveSavedOpportunityIds: ids => write('saved', ids),
    getSavedOpportunityIds: () => read('saved', ids =>
      Array.isArray(ids) && ids.every(id => typeof id === 'string'), []),
    clearSavedOpportunityIds: () => write('saved', null),
  };
}
module.exports = {createScopedStorage};
